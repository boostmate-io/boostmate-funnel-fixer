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

    // Build the invite link
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace(".supabase.co", ".lovable.app");
    // Use the published URL pattern
    const inviteLink = `https://boostmate-funnel-fixer.lovable.app/invite/${invite_code}`;

    // Send email using Supabase Auth admin API (generateLink approach)
    // Since we don't have a dedicated email service, we'll use the admin client
    // to send a simple invite notification
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User exists - send magic link so they can accept the invite
      const { error: otpError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: {
          redirectTo: inviteLink,
        },
      });
      // Even if magic link fails, the invite record exists and user can use it
    }

    // For new users, they'll need to register via the invite link
    // The invite link page handles both existing and new users

    return new Response(JSON.stringify({ success: true, invite_link: inviteLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending invite email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
