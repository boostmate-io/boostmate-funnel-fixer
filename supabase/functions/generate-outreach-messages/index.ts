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

    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id is required");

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from("outreach_leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadError || !lead) throw new Error("Lead not found");

    // Fetch setup types + outreach settings in parallel
    const [{ data: setupTypes }, { data: outreachSettings }] = await Promise.all([
      supabase.from("outreach_setup_types").select("*").eq("sub_account_id", lead.sub_account_id),
      supabase.from("outreach_settings").select("*").eq("sub_account_id", lead.sub_account_id).maybeSingle(),
    ]);

    const matchingSetupType = (setupTypes || []).find((st: any) => st.name === lead.setup_type);
    const setupDefaults = matchingSetupType
      ? {
          action: matchingSetupType.default_action || "",
          problem: matchingSetupType.default_problem || "",
          angle: matchingSetupType.default_angle || "",
        }
      : { action: "", problem: "", angle: "" };

    const messagingRules = (outreachSettings?.messaging_rules || {}) as any;
    const tone = messagingRules.tone || "conversational, non-salesy, natural";
    const maxLines = String(messagingRules.max_lines || "4-5");

    const setupTypesList =
      (setupTypes || [])
        .map(
          (st: any) =>
            `- ${st.name}${st.description ? ` (${st.description})` : ""}${st.default_action ? ` | Action: ${st.default_action}` : ""}${st.default_problem ? ` | Problem: ${st.default_problem}` : ""}${st.default_angle ? ` | Angle: ${st.default_angle}` : ""}`
        )
        .join("\n") || "No setup types defined — detect the best fit.";

    const followUpConfig = Array.isArray(outreachSettings?.follow_up_templates)
      ? (outreachSettings!.follow_up_templates as any[])
      : [];
    const followUpCount = followUpConfig.length;
    const customFollowups = followUpConfig
      .map((ft: any, i: number) => `Follow-up ${i + 1}: ${ft.content || ft || ""}`)
      .join("\n");

    // Delegate to admin-managed AI Action
    const inputs = {
      lead_name: lead.name || "",
      company: lead.company_name || "",
      niche: lead.niche || "",
      offer: lead.offer || "",
      platform: lead.platform || "",
      profile_url: lead.profile_url || "",
      notes: lead.notes || "",
      channel: lead.outreach_channel || "dm",
      current_setup_type: lead.setup_type || "",
      current_main_problem: lead.main_problem || "",
      current_main_angle: lead.main_angle || "",
      setup_types_list: setupTypesList,
      setup_default_action: setupDefaults.action,
      setup_default_problem: setupDefaults.problem,
      setup_default_angle: setupDefaults.angle,
      tone,
      max_lines: maxLines,
      custom_opener_template: outreachSettings?.opener_template || "",
      custom_followups: customFollowups,
      follow_up_count: String(followUpCount),
    };

    const aiActionResp = await fetch(`${supabaseUrl}/functions/v1/execute-ai-action`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        slug: "outreach_messages",
        inputs,
        extra_instructions: outreachSettings?.ai_prompt_context || undefined,
      }),
    });

    if (!aiActionResp.ok) {
      const status = aiActionResp.status;
      const errBody = await aiActionResp.json().catch(() => ({ error: "AI action failed" }));
      return new Response(JSON.stringify({ error: errBody.error || "AI action failed" }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { output } = await aiActionResp.json();
    const parsed = (output || {}) as Record<string, any>;

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

    // Replace messages for this lead
    await supabase.from("outreach_messages").delete().eq("lead_id", lead_id);

    const followupsArr: string[] = Array.isArray(parsed.followups)
      ? (parsed.followups as any[]).map((s) => String(s || ""))
      : [];

    const messageTypes: { type: string; content: string }[] = [
      { type: "opener", content: parsed.opener || "" },
      { type: "opener_alt", content: parsed.opener_alt || "" },
      ...followupsArr.map((content, i) => ({
        type: `followup_${i + 1}`,
        content,
      })),
    ];

    const messagesToInsert = messageTypes
      .filter((m) => m.content && m.content.trim().length > 0)
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
