import { supabase } from "@/integrations/supabase/client";

interface ExecuteAIActionParams {
  slug: string;
  inputs?: Record<string, any>;
  extraInstructions?: string;
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
}: ExecuteAIActionParams): Promise<ExecuteAIActionResult> {
  const { data, error } = await supabase.functions.invoke("execute-ai-action", {
    body: {
      slug,
      inputs,
      extra_instructions: extraInstructions,
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
