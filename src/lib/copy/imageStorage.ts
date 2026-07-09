import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export const COPY_ASSETS_BUCKET = "copy-assets";

/**
 * Value stored in `copy_document_components.outputs[key]` for a field
 * whose component output_structure type is "image".
 */
export interface CopyImageValue {
  path: string;      // storage key in copy-assets bucket
  filename?: string; // original filename (for display)
  size?: number;
  content_type?: string;
}

export function isCopyImageValue(v: any): v is CopyImageValue {
  return !!v && typeof v === "object" && typeof v.path === "string" && v.path.length > 0;
}

/**
 * Upload a file to `copy-assets/{subAccountId}/{documentId}/{uuid}-{filename}`.
 * Returns the value that should be persisted in the component outputs.
 */
export async function uploadCopyAsset(
  subAccountId: string,
  documentId: string,
  file: File,
): Promise<CopyImageValue> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const path = `${subAccountId}/${documentId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(COPY_ASSETS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return { path, filename: file.name, size: file.size, content_type: file.type || undefined };
}

export async function deleteCopyAsset(path: string): Promise<void> {
  const { error } = await supabase.storage.from(COPY_ASSETS_BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Sign a copy-assets path for temporary access. Works with either the
 * authenticated client or the anonymous public client (used on shared
 * funnel/analytics pages — the storage RLS policy allows anon reads for
 * assets attached to publicly-shared funnels).
 */
export async function signCopyAssetUrl(
  path: string,
  expiresInSeconds = 3600,
  client: SupabaseClient<any, any, any> = supabase as any,
): Promise<string | null> {
  const { data, error } = await client.storage.from(COPY_ASSETS_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
