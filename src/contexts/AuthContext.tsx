// @refresh reset
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  const signOutRecoveryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const clearRecoveryTimer = () => {
      if (signOutRecoveryTimerRef.current) {
        window.clearTimeout(signOutRecoveryTimerRef.current);
        signOutRecoveryTimerRef.current = null;
      }
    };

    const clearAuthState = () => {
      if (!isMounted) return;
      setSession(null);
      setUser(null);
      setIsReady(true);
    };

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsReady(true);
    };

    const recoverSession = (delay = 1200) => {
      clearRecoveryTimer();

      signOutRecoveryTimerRef.current = window.setTimeout(async () => {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!error && data.session) {
          applySession(data.session);
          return;
        }

        signOutRecoveryTimerRef.current = window.setTimeout(async () => {
          const { data: retryData, error: retryError } = await supabase.auth.getSession();
          if (!isMounted) return;

          if (!retryError && retryData.session) {
            applySession(retryData.session);
            return;
          }

          clearAuthState();
        }, 1200);
      }, delay);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) {
        clearRecoveryTimer();
        applySession(nextSession);
        return;
      }

      if (event === "SIGNED_OUT") {
        if (nextSession) {
          clearRecoveryTimer();
          applySession(nextSession);
          return;
        }

        recoverSession();
        return;
      }

      if (nextSession) {
        clearRecoveryTimer();
        applySession(nextSession);
        return;
      }

      recoverSession();
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (error || !data.session) {
          clearAuthState();
          return;
        }

        applySession(data.session);
      })
      .catch(() => {
        if (!isMounted) return;
        clearAuthState();
      });

    return () => {
      isMounted = false;
      clearRecoveryTimer();
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, session, isReady }), [user, session, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
