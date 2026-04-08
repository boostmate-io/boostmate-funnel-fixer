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
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let hasRestoredInitialSession = false;

    const applySession = (event: string, nextSession: Session | null) => {
      if (!isMounted) return;
      const nextUserId = nextSession?.user?.id ?? null;
      const prevUserId = currentUserIdRef.current;

      // Don't clear a valid user on TOKEN_REFRESHED with null session (429 race)
      if (!nextSession && prevUserId && event === "TOKEN_REFRESHED") {
        return;
      }

      // Always update session (for fresh tokens)
      setSession(nextSession);

      // Only update user object when the user ID actually changes
      if (nextUserId !== prevUserId) {
        currentUserIdRef.current = nextUserId;
        setUser(nextSession?.user ?? null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(event, nextSession);

      if (hasRestoredInitialSession || event !== "INITIAL_SESSION") {
        if (isMounted) setIsReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      hasRestoredInitialSession = true;
      applySession("INITIAL_SESSION", initialSession);
      if (isMounted) setIsReady(true);
    }).catch(() => {
      hasRestoredInitialSession = true;
      if (isMounted) setIsReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, session, isReady }), [user, session, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
