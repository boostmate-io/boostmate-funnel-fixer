import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Building2, User } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultEmail?: string;
  defaultMode?: "login" | "signup";
}

const AuthModal = ({ open, onClose, onSuccess, defaultEmail = "", defaultMode = "signup" }: AuthModalProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"standard" | "agency">("standard");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { account_type: accountType },
          },
        });
        if (error) throw error;
        toast.success(t("auth.signupSuccess"));
        onSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.loginSuccess"));
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-xl shadow-xl border border-border p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground mb-1">
          {mode === "signup" ? t("auth.signup") : t("auth.login")}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          {mode === "signup" ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
          <Input type="password" placeholder={t("auth.passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />

          {mode === "signup" && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Account type</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("standard")}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    accountType === "standard"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <User className="w-4 h-4" />
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("agency")}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    accountType === "agency"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Agency
                </button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? t("auth.loading") : mode === "signup" ? t("auth.signup") : t("auth.login")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "signup" ? (
            <>{t("auth.haveAccount")}{" "}<button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">{t("auth.login")}</button></>
          ) : (
            <>{t("auth.noAccount")}{" "}<button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">{t("auth.register")}</button></>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
