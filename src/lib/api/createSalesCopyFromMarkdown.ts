import { supabase } from "@/integrations/supabase/client";

interface MarkdownSection {
  title: string;
  content: string;
}

function parseMarkdownSections(markdown: string): MarkdownSection[] {
  if (!markdown.trim()) return [];

  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({
          title: currentTitle || "Intro",
          content: currentLines.join("\n").trim(),
        });
      }
      currentTitle = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push last section
  if (currentTitle || currentLines.length > 0) {
    sections.push({
      title: currentTitle || "Intro",
      content: currentLines.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.content.length > 0);
}

export async function createSalesCopyFromMarkdown(
  userId: string,
  projectId: string | null,
  assetName: string,
  markdown: string
): Promise<string | null> {
  const sections = parseMarkdownSections(markdown);
  if (sections.length === 0) return null;

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      user_id: userId,
      type: "sales_copy",
      name: assetName,
      project_id: projectId,
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    console.error("Error creating sales copy asset:", assetError);
    return null;
  }

  const sectionRows = sections.map((s, i) => ({
    asset_id: asset.id,
    title: s.title,
    content: s.content,
    sort_order: i,
  }));

  const { error: sectionsError } = await supabase
    .from("asset_sections")
    .insert(sectionRows);

  if (sectionsError) {
    console.error("Error creating asset sections:", sectionsError);
  }

  return asset.id;
}
