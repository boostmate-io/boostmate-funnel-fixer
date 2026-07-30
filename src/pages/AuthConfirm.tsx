import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-boostmate.svg";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "confirmed" | "invalid" | "error";

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [redirectTo, setRedirectTo] = useState("/");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("invalid");
      return;
    }

    let cancelled = false;
    void supabase.functions
      .invoke("confirm-auth-email", { body: { token } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.ok) {
          setStatus(data?.status === "invalid_or_expired" ? "invalid" : "error");
          return;
        }
        const nextRedirect = typeof data.redirectTo === "string" ? data.redirectTo : "/";
        setRedirectTo(nextRedirect);
        setStatus("confirmed");
        window.setTimeout(() => {
          window.location.assign(nextRedirect);
        }, 1400);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const goHome = () => {
    try {
      const url = new URL(redirectTo);
      window.location.assign(url.toString());
    } catch {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
        <img src={logo} alt="Boostmate" className="h-9 mx-auto mb-8" />

        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">Confirming your email</h1>
            <p className="text-sm text-muted-foreground">One moment while we activate your Boostmate account.</p>
          </>
        )}

        {status === "confirmed" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">Email confirmed</h1>
            <p className="text-sm text-muted-foreground mb-6">Redirecting you back to Boostmate so you can continue.</p>
            <Button onClick={goHome} className="w-full">Continue</Button>
          </>
        )}

        {status === "invalid" && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">Link expired</h1>
            <p className="text-sm text-muted-foreground mb-6">Please request a new confirmation email from the login screen.</p>
            <Button onClick={() => navigate("/", { replace: true })} className="w-full">Back to Boostmate</Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">Could not confirm email</h1>
            <p className="text-sm text-muted-foreground mb-6">Please request a new confirmation email or try again in a moment.</p>
            <Button onClick={() => navigate("/", { replace: true })} className="w-full">Back to Boostmate</Button>
          </>
        )}
      </div>
    </div>
  );
}