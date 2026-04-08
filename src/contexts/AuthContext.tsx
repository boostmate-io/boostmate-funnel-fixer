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
  const lastStableSessionRef = useRef<Session | null>(null);
  const initialSessionResolvedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;

      if (nextSession?.user) {
        lastStableSessionRef.current = nextSession;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const clearSession = () => {
      if (!isMounted) return;

      lastStableSessionRef.current = null;
      setSession(null);
      setUser(null);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (event === "INITIAL_SESSION") {
        initialSessionResolvedRef.current = true;

        if (nextSession?.user) {
          applySession(nextSession);
        } else if (!lastStableSessionRef.current) {
          clearSession();
        }

        setIsReady(true);
        return;
      }

      if (event === "SIGNED_OUT") {
        clearSession();
        setIsReady(true);
        return;
      }

      if (nextSession?.user) {
        applySession(nextSession);
        setIsReady(true);
        return;
      }

      if (!lastStableSessionRef.current && initialSessionResolvedRef.current) {
        clearSession();
      }

      setIsReady(true);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!isMounted) return;

        initialSessionResolvedRef.current = true;

        if (initialSession?.user) {
          applySession(initialSession);
        } else if (!lastStableSessionRef.current) {
          applySession(null);
        }

        setIsReady(true);
      })
      .catch(() => {
        if (!isMounted) return;

        initialSessionResolvedRef.current = true;

        if (!lastStableSessionRef.current) {
          applySession(null);
        }

        setIsReady(true);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, session, isReady }), [user, session, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
