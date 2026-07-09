import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isCopyImageValue, signCopyAssetUrl } from "./imageStorage";

interface OutputField {
  key: string;
  type: string;
  is_primary?: boolean;
}

interface CopyComponentDef {
  slug: string;
  output_structure: OutputField[] | any;
}

interface DocumentComponentRow {
  document_id: string;
  component_slug: string;
  sort_order: number;
  outputs: Record<string, any> | any;
}

/**
 * Generic thumbnail resolver.
 *
 * For each Copy Document, scans its components (in sort order) for output
 * fields whose type is "image". Prefers a field marked `is_primary: true`;
 * otherwise takes the first image field that has an uploaded value.
 *
 * Not Meta-Ads-specific — works for any framework (VSL thumbnails, email hero
 * images, ad creatives, social posts, etc.).
 *
 * Returns a map of documentId → signed URL. Documents without an image are
 * simply absent from the map; callers fall back to a placeholder.
 */
export async function resolveDocumentThumbnails(
  documentIds: string[],
  opts: { client?: SupabaseClient<any, any, any> } = {},
): Promise<Record<string, string>> {
  if (documentIds.length === 0) return {};
  const client = (opts.client || supabase) as SupabaseClient<any, any, any>;

  const [{ data: dcs }, { data: defs }] = await Promise.all([
    client
      .from("copy_document_components")
      .select("document_id, component_slug, sort_order, outputs")
      .in("document_id", documentIds)
      .order("sort_order"),
    client.from("copy_components").select("slug, output_structure"),
  ]);

  const defBySlug = new Map<string, CopyComponentDef>();
  for (const d of (defs || []) as CopyComponentDef[]) defBySlug.set(d.slug, d);

  // Group components per document, already in sort order.
  const byDoc = new Map<string, DocumentComponentRow[]>();
  for (const row of (dcs || []) as DocumentComponentRow[]) {
    const list = byDoc.get(row.document_id) || [];
    list.push(row);
    byDoc.set(row.document_id, list);
  }

  const result: Record<string, string> = {};

  for (const docId of documentIds) {
    const rows = byDoc.get(docId) || [];
    let chosenPath: string | null = null;

    // Pass 1: primary image field with a value.
    outer: for (const row of rows) {
      const def = defBySlug.get(row.component_slug);
      const structure: OutputField[] = Array.isArray(def?.output_structure) ? def!.output_structure : [];
      for (const f of structure) {
        if (f.type !== "image" || !f.is_primary) continue;
        const v = row.outputs?.[f.key];
        if (isCopyImageValue(v)) { chosenPath = v.path; break outer; }
      }
    }

    // Pass 2: first image field with a value.
    if (!chosenPath) {
      outer: for (const row of rows) {
        const def = defBySlug.get(row.component_slug);
        const structure: OutputField[] = Array.isArray(def?.output_structure) ? def!.output_structure : [];
        for (const f of structure) {
          if (f.type !== "image") continue;
          const v = row.outputs?.[f.key];
          if (isCopyImageValue(v)) { chosenPath = v.path; break outer; }
        }
      }
    }

    if (chosenPath) {
      const url = await signCopyAssetUrl(chosenPath, 3600, client);
      if (url) result[docId] = url;
    }
  }

  return result;
}
