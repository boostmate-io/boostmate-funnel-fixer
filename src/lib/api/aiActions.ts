import { supabase } from "@/integrations/supabase/client";

interface ExecuteAIActionParams {
  slug: string;
  inputs?: Record<string, any>;
  extraInstructions?: string;
  /**
   * Optional per-caller output structure override.
   * When provided, the edge function uses this instead of the AI Action's
   * own `output_structure` (which stays as fallback for other modules).
   */
  outputStructure?: Array<{ key: string; label: string; type: string; item_schema?: any[] }>;
}

interface ExecuteAIActionResult {
  output: Record<string, any>;
  action_slug: string;
}

/**
 * Execute an AI Action by its slug.
 * Can be called from anywhere in the app.
 */
export async function executeAIAction({
  slug,
  inputs = {},
  extraInstructions,
  outputStructure,
}: ExecuteAIActionParams): Promise<ExecuteAIActionResult> {
  const { data, error } = await supabase.functions.invoke("execute-ai-action", {
    body: {
      slug,
      inputs,
      extra_instructions: extraInstructions,
      output_structure: outputStructure,
    },
  });

  if (error) {
    throw new Error(error.message || "AI Action execution failed");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as ExecuteAIActionResult;
}

/**
 * Fetch all available AI actions (for dropdowns, selectors, etc.)
 */
export async function getAvailableAIActions() {
  const { data, error } = await supabase
    .from("ai_actions")
    .select("id, name, slug, description, type, input_structure, output_structure")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data || [];
}
