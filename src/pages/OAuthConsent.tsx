import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-boostmate.svg";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; redirect_uris?: string[] };
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
};
const oauthApi = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
    approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
    denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  };
}).oauth;

const isSameOriginPath = (value: string | null): value is string => {
  if (!value) return false;
  return value.startsWith("/") && !value.startsWith("//");
};

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session, isReady } = useAuth();
  const authorizationId = params.get("authorization_id") ?? "";

  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!authorizationId) {
      setError("Missing authorization_id");
      return;
    }
    if (!session) {
      const nextUrl = window.location.pathname + window.location.search;
      navigate(`/?next=${encodeURIComponent(nextUrl)}`, { replace: true });
      return;
    }
    let active = true;
    (async () => {
      const { data, error: err } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, session, isReady, navigate]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "an application";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-8 space-y-6">
        <img src={logo} alt="Boostmate" className="h-8" />
        {error ? (
          <div className="space-y-3">
            <h1 className="text-xl font-display font-bold text-foreground">Authorization error</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !details ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <span>Loading authorization…</span>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">
                Connect {clientName} to Boostmate
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {clientName} will be able to call Boostmate tools while you are signed in.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="text-foreground font-medium">This will let it:</div>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Act on your Boostmate account as you</li>
                <li>Read and use data your account has access to (workspaces, funnels, offers, analytics, blueprint)</li>
                {scopes.filter((s) => !["openid", "email", "profile"].includes(s)).map((s) => (
                  <li key={s}>Additional permission: {s}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground pt-2">
                This does not bypass Boostmate's permissions or backend policies.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {busy ? "Working…" : "Approve"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthConsent;
export { isSameOriginPath };
