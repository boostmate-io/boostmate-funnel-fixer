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

const UNEXPECTED_SIGN_OUT_MAX_MS = 60_000;
const ACCESS_TOKEN_SAFETY_MS = 30_000;
const RECOVERY_DELAYS = [500, 1500, 4000, 8000];

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

  useEffect(() => {
    let isMounted = true;

    const clearRecoveryTimer = () => {
      if (recoveryTimerRef.current) {
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
      setSession(null);
      setUser(null);
      setIsReady(true);
    };

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      clearRecoveryTimer();
      recoveryAttemptRef.current = 0;
      unexpectedSignedOutAtRef.current = null;
      intentionalSignOutRef.current = false;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsReady(true);
      if (nextSession) {
        lastKnownSessionRef.current = nextSession;
      }
    };

    const keepLastKnownSession = () => {
      const cachedSession = lastKnownSessionRef.current;
      if (!isMounted || !hasFreshAccessToken(cachedSession)) return false;
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

    const scheduleRecovery = (overrideDelay?: number) => {
      clearRecoveryTimer();
      const nextAttempt = recoveryAttemptRef.current;
      const delay = overrideDelay ?? RECOVERY_DELAYS[Math.min(nextAttempt, RECOVERY_DELAYS.length - 1)];

      recoveryTimerRef.current = window.setTimeout(async () => {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!error && data.session) {
          applySession(data.session);
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

      if (nextSession && ["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) {
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

    return () => {
      isMounted = false;
      clearRecoveryTimer();
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    intentionalSignOutRef.current = true;
    recoveryAttemptRef.current = 0;
    unexpectedSignedOutAtRef.current = null;

    const { error } = await supabase.auth.signOut();
    if (error) {
      intentionalSignOutRef.current = false;
      throw error;
    }
  };

  const value = useMemo(() => ({ user, session, isReady, signOut }), [user, session, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
