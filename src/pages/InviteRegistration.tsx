import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logo from "@/assets/logo-boostmate.svg";

const InviteRegistration = () => {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!code) { setLoading(false); return; }
      // Try new account_invites table first
      const { data } = await supabase
        .from("account_invites")
        .select("*")
        .eq("invite_code", code)
        .eq("status", "pending")
        .single();
      if (data) {
        setInvite(data);
        setEmail((data as any).email || "");
      }
      setLoading(false);
    };
    loadInvite();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: displayName },
        },
      });
      if (authError) throw authError;

      if (authData.user) {
        // Wait for signup trigger to create account structure
        await new Promise((r) => setTimeout(r, 1500));

        // Update display name
        await supabase
          .from("profiles")
          .update({ display_name: displayName } as any)
          .eq("id", authData.user.id);

        // Create membership for the invited sub account
        if (invite.sub_account_id) {
          await supabase
            .from("account_memberships")
            .insert({
              user_id: authData.user.id,
              main_account_id: invite.main_account_id,
              sub_account_id: invite.sub_account_id,
              role: invite.role || "workspace_member",
            } as any);
        }

        // Mark invite as accepted
        await supabase
          .from("account_invites")
          .update({ status: "accepted" } as any)
          .eq("id", invite.id);
      }

      toast.success(t("auth.signupSuccess"));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || t("auth.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("auth.loading")}</p>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={logo} alt="Boostmate" className="h-8 mx-auto" />
          <h1 className="text-xl font-display font-bold text-foreground">{t("agency.inviteExpired")}</h1>
          <p className="text-muted-foreground text-sm">{t("agency.inviteExpiredDescription")}</p>
          <Button onClick={() => navigate("/")}>{t("agency.backToHome")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card rounded-xl shadow-xl border border-border p-8 w-full max-w-md">
        <img src={logo} alt="Boostmate" className="h-8 mx-auto mb-6" />
        <h2 className="text-2xl font-display font-bold text-foreground mb-1 text-center">
          {t("agency.joinTitle")}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm text-center">
          {t("agency.joinDescription")}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder={t("agency.displayNamePlaceholder")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="h-11" />
          <Input type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
          <Input type="password" placeholder={t("auth.passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? t("auth.loading") : t("auth.signup")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default InviteRegistration;
