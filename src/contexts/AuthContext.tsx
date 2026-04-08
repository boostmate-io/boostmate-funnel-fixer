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
  const recoveryInFlightRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let hasRestoredInitialSession = false;

    const commitSession = (nextSession: Session | null) => {
      if (!isMounted) return;
      currentUserIdRef.current = nextSession?.user?.id ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const recoverSession = async () => {
      if (!isMounted || recoveryInFlightRef.current) return;
      recoveryInFlightRef.current = true;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          commitSession(null);
          return;
        }

        if (data.session) {
          commitSession(data.session);
          return;
        }

        commitSession(null);
      } finally {
        recoveryInFlightRef.current = false;
        if (isMounted) setIsReady(true);
      }
    };

    const applySession = (event: string, nextSession: Session | null) => {
      if (!isMounted) return;
      const hasKnownUser = !!currentUserIdRef.current;

      if (!nextSession && hasKnownUser) {
        void recoverSession();
        return;
      }

      commitSession(nextSession);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(event, nextSession);

      if (hasRestoredInitialSession || event !== "INITIAL_SESSION") {
        if (isMounted) setIsReady(true);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        hasRestoredInitialSession = true;
        commitSession(initialSession);
        if (isMounted) setIsReady(true);
      })
      .catch(() => {
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
