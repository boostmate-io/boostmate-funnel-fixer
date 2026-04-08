import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, invite_code, account_name } = await req.json();

    if (!email || !invite_code) {
      return new Response(JSON.stringify({ error: "Missing email or invite_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const inviteLink = `https://boostmate-funnel-fixer.lovable.app/invite/${invite_code}`;

    // Try to send an auth invite email via Supabase Auth
    // This uses Supabase's built-in email sending
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invite_code,
        account_name: account_name || "workspace",
      },
    });

    if (error) {
      // User might already exist - that's OK, invite record is created
      // They can use the invite link directly
      console.log("Auth invite error (may be expected for existing users):", error.message);
      return new Response(JSON.stringify({ 
        success: true, 
        invite_link: inviteLink,
        email_sent: false,
        note: "Invite created. User can use the invite link to join."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invite_link: inviteLink,
      email_sent: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending invite:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
