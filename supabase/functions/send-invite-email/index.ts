import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, invite_code, account_name } = await req.json();

    if (!email || !invite_code) {
      return new Response(JSON.stringify({ error: "Missing email or invite_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteLink = `https://boostmate-funnel-fixer.lovable.app/invite/${invite_code}`;

    // Do NOT use inviteUserByEmail — that creates an auth user and triggers
    // the handle_new_user_role function which immediately marks the invite
    // as "accepted". Instead, just return the invite link. The invite email
    // can be sent via a transactional email service later. For now the link
    // is shown in the UI so the agency can share it manually.

    console.log(`Invite created for ${email}: ${inviteLink}`);

    return new Response(JSON.stringify({
      success: true,
      invite_link: inviteLink,
      email_sent: false,
      note: "Invite link generated. Share it with the user to join.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-invite-email:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
