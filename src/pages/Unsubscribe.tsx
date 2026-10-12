import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo-boostmate.svg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Unsubscribe | Boostmate";
    if (!token) { setState("invalid"); return; }
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.valid !== false) setState("valid");
        else if (d.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    if (error) setState("error");
    else setState((data as any)?.success === false && (data as any)?.reason === "already_unsubscribed" ? "already" : "done");
  };

  const copy: Record<State, { h: string; p: string }> = {
    loading: { h: "Checking your link…", p: "" },
    valid: { h: "Unsubscribe from Boostmate emails?", p: "You'll stop receiving app emails at this address. Sign-in and password emails keep working." },
    already: { h: "You're already unsubscribed", p: "This address no longer receives app emails from Boostmate." },
    invalid: { h: "This link isn't valid", p: "The unsubscribe link is missing or has expired." },
    done: { h: "You've been unsubscribed", p: "You won't receive app emails from Boostmate at this address anymore." },
    error: { h: "Something went wrong", p: "Please try again in a moment." },
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center space-y-5">
        <img src={logo} alt="Boostmate" className="h-7 mx-auto" />
        {state === "loading" && <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />}
        <h1 className="text-2xl font-display font-bold text-foreground">{copy[state].h}</h1>
        {copy[state].p && <p className="text-muted-foreground">{copy[state].p}</p>}
        {state === "valid" && <Button onClick={confirm} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}Confirm unsubscribe</Button>}
      </div>
    </div>
  );
}
