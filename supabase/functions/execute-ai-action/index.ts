import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, inputs, extra_instructions } = await req.json();

    if (!slug) {
      return new Response(JSON.stringify({ error: "Missing slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the AI action
    const { data: action, error: actionErr } = await supabase
      .from("ai_actions")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (actionErr || !action) {
      return new Response(JSON.stringify({ error: `AI Action '${slug}' not found or inactive` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch linked instruction blocks
    const { data: linkedBlocks } = await supabase
      .from("ai_action_instruction_blocks")
      .select("instruction_block_id, sort_order")
      .eq("ai_action_id", action.id)
      .order("sort_order");

    let instructionContent = "";
    if (linkedBlocks && linkedBlocks.length > 0) {
      const blockIds = linkedBlocks.map((lb: any) => lb.instruction_block_id);
      const { data: blocks } = await supabase
        .from("ai_instruction_blocks")
        .select("id, content")
        .in("id", blockIds);

      if (blocks) {
        // Maintain sort order
        const blockMap = new Map(blocks.map((b: any) => [b.id, b.content]));
        instructionContent = linkedBlocks
          .map((lb: any) => blockMap.get(lb.instruction_block_id) || "")
          .filter(Boolean)
          .join("\n\n---\n\n");
      }
    }

    // Build the prompt from template
    let prompt = action.prompt_template || "";
    const inputMap = inputs || {};
    
    // Replace {{variable}} placeholders
    prompt = prompt.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
      return inputMap[key] !== undefined ? String(inputMap[key]) : `{{${key}}}`;
    });

    // Build system prompt
    let systemPrompt = "You are an expert AI assistant.";
    if (instructionContent) {
      systemPrompt += "\n\n## INSTRUCTION BLOCKS\n\n" + instructionContent;
    }
    if (extra_instructions) {
      systemPrompt += "\n\n## ADDITIONAL INSTRUCTIONS\n\n" + extra_instructions;
    }

    // Build tool calling for structured output
    const outputStructure = action.output_structure || [];
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const field of outputStructure) {
      const f = field as { key: string; label: string; type: string };
      if (f.type === "array") {
        properties[f.key] = {
          type: "array",
          items: { type: "string" },
          description: f.label,
        };
      } else {
        properties[f.key] = { type: "string", description: f.label };
      }
      required.push(f.key);
    }

    const modelSettings = action.model_settings as { model?: string; temperature?: number } || {};
    const model = modelSettings.model || "google/gemini-3-flash-preview";
    const temperature = modelSettings.temperature ?? 0.7;

    const body: any = {
      model,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    };

    // Use tool calling for structured output if output structure is defined
    if (outputStructure.length > 0) {
      body.tools = [
        {
          type: "function",
          function: {
            name: "deliver_output",
            description: "Return the structured output",
            parameters: {
              type: "object",
              properties,
              required,
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = { type: "function", function: { name: "deliver_output" } };
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    // Extract output
    let output: any;
    const choice = aiData.choices?.[0];

    if (choice?.message?.tool_calls?.[0]) {
      try {
        output = JSON.parse(choice.message.tool_calls[0].function.arguments);
      } catch {
        output = { raw: choice.message.tool_calls[0].function.arguments };
      }
    } else if (choice?.message?.content) {
      output = { raw: choice.message.content };
    } else {
      output = { raw: "" };
    }

    return new Response(JSON.stringify({ output, action_slug: slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("execute-ai-action error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
