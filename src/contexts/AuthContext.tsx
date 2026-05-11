// @refresh reset
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const fallbackAuth: AuthContextType = {
  user: null,
  session: null,
  isReady: false,
  signOut: async () => undefined,
};

const UNEXPECTED_SIGN_OUT_MAX_MS = 120_000;
const ACCESS_TOKEN_SAFETY_MS = 30_000;
const RECOVERY_DELAYS = [500, 1500, 4000, 8000];
const AUTH_STORAGE_KEY_FRAGMENT = "auth-token";
const INTENTIONAL_SIGN_OUT_KEY = "boostmate-intentional-signout";

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    console.warn("useAuth called outside AuthProvider – returning fallback");
    return fallbackAuth;
  }
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  const recoveryTimerRef = useRef<number | null>(null);
  const recoveryAttemptRef = useRef(0);
  const lastKnownSessionRef = useRef<Session | null>(null);
  const unexpectedSignedOutAtRef = useRef<number | null>(null);
  const intentionalSignOutRef = useRef(false);
  const currentUserRef = useRef<User | null>(null);
  const currentSessionRef = useRef<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    const clearRecoveryTimer = () => {
      if (recoveryTimerRef.current !== null) {
        window.clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    };

    const hasFreshAccessToken = (candidate: Session | null) => {
      if (!candidate?.access_token || !candidate?.user || !candidate.expires_at) return false;
      return candidate.expires_at * 1000 > Date.now() + ACCESS_TOKEN_SAFETY_MS;
    };

    const clearAuthState = () => {
      if (!isMounted) return;
      clearRecoveryTimer();
      recoveryAttemptRef.current = 0;
      unexpectedSignedOutAtRef.current = null;
      intentionalSignOutRef.current = false;
      lastKnownSessionRef.current = null;
      currentSessionRef.current = null;
      currentUserRef.current = null;
      setSession(null);
      setUser(null);
      setIsReady(true);
    };

    const applySession = (nextSession: Session | null, options?: { skipStateUpdate?: boolean }) => {
      if (!isMounted) return;
      clearRecoveryTimer();
      recoveryAttemptRef.current = 0;
      unexpectedSignedOutAtRef.current = null;
      intentionalSignOutRef.current = false;
      currentSessionRef.current = nextSession;
      currentUserRef.current = nextSession?.user ?? null;
      if (nextSession) {
        lastKnownSessionRef.current = nextSession;
      }

      if (!options?.skipStateUpdate) {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }

      setIsReady(true);
    };

    const keepLastKnownSession = () => {
      const cachedSession = lastKnownSessionRef.current;
      if (!isMounted || !hasFreshAccessToken(cachedSession)) return false;
      currentSessionRef.current = cachedSession;
      currentUserRef.current = cachedSession.user;
      setSession(cachedSession);
      setUser(cachedSession.user);
      setIsReady(true);
      return true;
    };

    const shouldKeepRecovering = () => {
      const cachedSession = lastKnownSessionRef.current;
      const startedAt = unexpectedSignedOutAtRef.current;
      if (!hasFreshAccessToken(cachedSession) || !startedAt) return false;
      return Date.now() - startedAt < UNEXPECTED_SIGN_OUT_MAX_MS;
    };

    const tryRecoverSession = async () => {
      // First check if another tab already wrote a fresh session to storage.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session && hasFreshAccessToken(sessionData.session)) {
        return sessionData.session;
      }
      // Otherwise explicitly attempt a refresh using the last known refresh token.
      const cached = lastKnownSessionRef.current;
      if (cached?.refresh_token) {
        try {
          const { data: refreshed } = await supabase.auth.refreshSession({
            refresh_token: cached.refresh_token,
          });
          if (refreshed.session) return refreshed.session;
        } catch {
          // ignore — fall through to retry
        }
      }
      return null;
    };

    const scheduleRecovery = (overrideDelay?: number) => {
      clearRecoveryTimer();
      const nextAttempt = recoveryAttemptRef.current;
      const delay = overrideDelay ?? RECOVERY_DELAYS[Math.min(nextAttempt, RECOVERY_DELAYS.length - 1)];

      recoveryTimerRef.current = window.setTimeout(async () => {
        const recovered = await tryRecoverSession();
        if (!isMounted) return;

        if (recovered) {
          applySession(recovered);
          return;
        }

        recoveryAttemptRef.current += 1;

        if (shouldKeepRecovering()) {
          keepLastKnownSession();
          scheduleRecovery();
          return;
        }

        clearAuthState();
      }, delay);
    };

    const startUnexpectedSignOutRecovery = () => {
      if (!isMounted) return;
      if (!unexpectedSignedOutAtRef.current) {
        unexpectedSignedOutAtRef.current = Date.now();
      }

      if (keepLastKnownSession()) {
        scheduleRecovery(500);
        return;
      }

      scheduleRecovery(300);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (event === "TOKEN_REFRESHED") {
        if (!nextSession) {
          startUnexpectedSignOutRecovery();
          return;
        }

        const currentUserId = currentUserRef.current?.id ?? null;
        const shouldSkipStateUpdate = currentUserId === nextSession.user.id;
        applySession(nextSession, { skipStateUpdate: shouldSkipStateUpdate });
        return;
      }

      if (nextSession && ["INITIAL_SESSION", "SIGNED_IN", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) {
        applySession(nextSession);
        return;
      }

      if (event === "SIGNED_OUT") {
        if (intentionalSignOutRef.current) {
          clearAuthState();
          return;
        }

        if (nextSession) {
          applySession(nextSession);
          return;
        }

        startUnexpectedSignOutRecovery();
        return;
      }

      if (nextSession) {
        applySession(nextSession);
        return;
      }

      if (intentionalSignOutRef.current) {
        clearAuthState();
        return;
      }

      startUnexpectedSignOutRecovery();
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (!error && data.session) {
          applySession(data.session);
          return;
        }

        if (keepLastKnownSession()) {
          unexpectedSignedOutAtRef.current = Date.now();
          scheduleRecovery(500);
          return;
        }

        clearAuthState();
      })
      .catch(() => {
        if (!isMounted) return;

        if (keepLastKnownSession()) {
          unexpectedSignedOutAtRef.current = Date.now();
          scheduleRecovery(500);
          return;
        }

        clearAuthState();
      });

    // Cross-tab sync: if another tab refreshes the token, adopt that session
    // instead of treating our stale token as an unexpected sign-out. This
    // prevents refresh-token races when the app is open in multiple tabs
    // (e.g. preview + custom domain).
    const handleStorage = (e: StorageEvent) => {
      if (!isMounted || !e.key || !e.key.includes("auth-token")) return;
      void supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) return;
        if (data.session && hasFreshAccessToken(data.session)) {
          applySession(data.session);
        }
      });
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      clearRecoveryTimer();
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const signOut = async () => {
    intentionalSignOutRef.current = true;
    recoveryAttemptRef.current = 0;
    unexpectedSignedOutAtRef.current = null;
    lastKnownSessionRef.current = null;

    const { error } = await supabase.auth.signOut();
    if (error) {
      intentionalSignOutRef.current = false;
      throw error;
    }
  };

  const value = useMemo(() => ({ user, session, isReady, signOut }), [user, session, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
