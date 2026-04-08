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
  const pendingSessionCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const clearPendingSessionCheck = () => {
      if (pendingSessionCheckRef.current) {
        window.clearTimeout(pendingSessionCheckRef.current);
        pendingSessionCheckRef.current = null;
      }
    };

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;

      clearPendingSessionCheck();

      if (nextSession?.user) {
        lastStableSessionRef.current = nextSession;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const clearSession = () => {
      if (!isMounted) return;

      clearPendingSessionCheck();

      lastStableSessionRef.current = null;
      setSession(null);
      setUser(null);
    };

    const verifySessionAfterDelay = () => {
      clearPendingSessionCheck();

      pendingSessionCheckRef.current = window.setTimeout(() => {
        void supabase.auth
          .getSession()
          .then(({ data: { session: recoveredSession } }) => {
            if (!isMounted) return;

            if (recoveredSession?.user) {
              applySession(recoveredSession);
              setIsReady(true);
              return;
            }

            clearSession();
            setIsReady(true);
          })
          .catch(() => {
            if (!isMounted) return;

            clearSession();
            setIsReady(true);
          });
      }, 1200);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        if (lastStableSessionRef.current) {
          verifySessionAfterDelay();
        } else {
          clearSession();
          setIsReady(true);
        }
        return;
      }

      if (event === "INITIAL_SESSION" && !initialSessionResolvedRef.current && !nextSession?.user) {
        return;
      }

      if (nextSession?.user) {
        applySession(nextSession);
        setIsReady(true);
        return;
      }

      if (lastStableSessionRef.current) {
        verifySessionAfterDelay();
        return;
      }

      if (!lastStableSessionRef.current && initialSessionResolvedRef.current) {
        applySession(null);
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
      clearPendingSessionCheck();
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, session, isReady }), [user, session, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
