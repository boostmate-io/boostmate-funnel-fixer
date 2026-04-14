import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { lead_id, settings } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("outreach_leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadError || !lead) throw new Error("Lead not found");

    // Fetch outreach settings for this sub_account
    const { data: outreachSettings } = await supabase
      .from("outreach_settings")
      .select("*")
      .eq("sub_account_id", lead.sub_account_id)
      .maybeSingle();

    const openerTemplate = outreachSettings?.opener_template || "";
    const followUpTemplates = outreachSettings?.follow_up_templates || [];
    const messagingRules = outreachSettings?.messaging_rules || {};
    const aiPromptContext = outreachSettings?.ai_prompt_context || "";

    const tone = (messagingRules as any).tone || "conversational, non-salesy, natural";
    const maxLines = (messagingRules as any).max_lines || "4-5";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an outreach message copywriter for a funnel-building agency. You write DMs and emails that are short, conversational, non-salesy, and natural. No emojis. No exclamation marks unless absolutely necessary.

Your tone: ${tone}
Max lines per message: ${maxLines}
${aiPromptContext ? `Additional context: ${aiPromptContext}` : ""}

You will generate messages for outreach to a lead. Return a JSON object with these exact keys:
- setup_type: detected setup type of the lead (e.g. "webinar funnel", "VSL", "direct offer page")
- main_problem: the main conversion problem you detect based on their setup
- main_angle: the angle you'd use to approach them
- opener: the opening DM/email message
- opener_alt: an alternative opener
- followup_1: first follow-up message
- followup_2: second follow-up message
- followup_3: third follow-up message
- followup_4: fourth follow-up (clean exit)

OPENER STRUCTURE (follow strictly):
Line 1: Hey [name], quick question — are you mainly [specific action based on setup] to get clients right now?
Line 2: Short insight about their setup causing lost conversions
Line 3: I build sales funnels for coaches, which is basically a simple flow that solves that problem
Line 4: Happy to map out a few ideas for your specific situation for free if you're open to it.

${openerTemplate ? `Custom opener template override:\n${openerTemplate}` : ""}

FOLLOW-UP DEFAULTS (use these as base, adapt to the lead):
${(followUpTemplates as any[]).length > 0
  ? (followUpTemplates as any[]).map((ft: any, i: number) => `Follow-up ${i + 1}: ${ft.content || ft}`).join("\n")
  : `Follow-up 1: Btw there's no catch haha, I'm just doing a few of these for free right now to build out some extra case studies. Not sure if it's something you need or are focused on at the moment?
Follow-up 2: Ask what they are currently using to get clients and offer to send a few ideas. No call needed.
Follow-up 3: Mention noticing quick improvements and offer to record a short video.
Follow-up 4: Clean exit. Say it's all good and they can reach out anytime.`}

Return ONLY valid JSON. No markdown, no code blocks.`;

    const userPrompt = `Generate outreach messages for this lead:
Name: ${lead.name}
Company: ${lead.company_name}
Niche: ${lead.niche}
Offer: ${lead.offer}
Platform: ${lead.platform}
Profile URL: ${lead.profile_url}
Notes: ${lead.notes}
Channel: ${lead.outreach_channel}
${lead.setup_type ? `Current setup type: ${lead.setup_type}` : ""}
${lead.main_problem ? `Current main problem: ${lead.main_problem}` : ""}
${lead.main_angle ? `Current main angle: ${lead.main_angle}` : ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (strip markdown code blocks if present)
    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    // Update lead with detected fields
    await supabase
      .from("outreach_leads")
      .update({
        setup_type: parsed.setup_type || lead.setup_type,
        main_problem: parsed.main_problem || lead.main_problem,
        main_angle: parsed.main_angle || lead.main_angle,
        status: "drafted",
      })
      .eq("id", lead_id);

    // Delete existing messages for this lead and insert new ones
    await supabase.from("outreach_messages").delete().eq("lead_id", lead_id);

    const messageTypes = [
      { type: "opener", content: parsed.opener },
      { type: "opener_alt", content: parsed.opener_alt },
      { type: "followup_1", content: parsed.followup_1 },
      { type: "followup_2", content: parsed.followup_2 },
      { type: "followup_3", content: parsed.followup_3 },
      { type: "followup_4", content: parsed.followup_4 },
    ];

    const messagesToInsert = messageTypes
      .filter((m) => m.content)
      .map((m) => ({
        lead_id,
        message_type: m.type,
        channel: lead.outreach_channel,
        content: m.content,
        sent: false,
      }));

    if (messagesToInsert.length > 0) {
      await supabase.from("outreach_messages").insert(messagesToInsert);
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-outreach-messages error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
