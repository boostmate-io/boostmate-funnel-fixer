import { supabase } from "@/integrations/supabase/client";

export async function scrapeLandingPage(url: string): Promise<{ screenshot: string; markdown: string }> {
  const { data, error } = await supabase.functions.invoke("scrape-landing-page", {
    body: { url },
  });

  if (error) {
    console.error("Error scraping landing page:", error);
    return { screenshot: "", markdown: "" };
  }

  if (!data?.success) {
    console.error("Scrape failed:", data?.error);
    return { screenshot: "", markdown: "" };
  }

  return {
    screenshot: data.screenshot || "",
    markdown: data.markdown || "",
  };
}
