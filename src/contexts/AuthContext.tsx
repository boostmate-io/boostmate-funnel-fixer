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

  const intentionalSignOutRef = useRef(false);
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

    const originalSignOut = supabase.auth.signOut.bind(supabase.auth);
    supabase.auth.signOut = async (...args: any[]) => {
      intentionalSignOutRef.current = true;
      clearRecoveryTimer();
      return originalSignOut(...args);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      clearRecoveryTimer();

      if (event === "SIGNED_OUT") {
        if (intentionalSignOutRef.current) {
          intentionalSignOutRef.current = false;
          clearAuthState();
          return;
        }

        signOutRecoveryTimerRef.current = window.setTimeout(async () => {
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) {
            clearAuthState();
            return;
          }
          applySession(data.session);
        }, 400);
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        applySession(nextSession);
        return;
      }

      if (["INITIAL_SESSION", "SIGNED_IN", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) {
        intentionalSignOutRef.current = false;
        applySession(nextSession);
        return;
      }

      applySession(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        applySession(data.session ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsReady(true);
      });

    return () => {
      isMounted = false;
      clearRecoveryTimer();
      subscription.unsubscribe();
      supabase.auth.signOut = originalSignOut;
    };
  }, []);

  const value = useMemo(() => ({ user, session, isReady }), [user, session, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
