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

  // Track current user ID to avoid unnecessary re-renders on token refresh
  const currentUserIdRef = useRef<string | null>(null);
  // Track whether signOut was explicitly called
  const intentionalSignOutRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Intercept signOut to set intentional flag
    const originalSignOut = supabase.auth.signOut.bind(supabase.auth);
    supabase.auth.signOut = async (...args: any[]) => {
      intentionalSignOutRef.current = true;
      return originalSignOut(...args);
    };

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;

      const nextUserId = nextSession?.user?.id ?? null;
      const prevUserId = currentUserIdRef.current;

      if (nextUserId && nextUserId === prevUserId) {
        // Same user, just a token refresh - DON'T update state to avoid re-renders
        // But do update session ref silently for any code that needs the latest token
        sessionRef.current = nextSession;
        return;
      }

      currentUserIdRef.current = nextUserId;
      sessionRef.current = nextSession;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const sessionRef = { current: null as Session | null };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        // Only clear state on intentional sign-out
        if (intentionalSignOutRef.current) {
          currentUserIdRef.current = null;
          sessionRef.current = null;
          setSession(null);
          setUser(null);
          setIsReady(true);
          intentionalSignOutRef.current = false;
        }
        // Ignore SIGNED_OUT from token refresh failures
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        // Just update the internal ref, don't trigger re-renders
        if (nextSession) {
          sessionRef.current = nextSession;
        }
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        applySession(nextSession);
        setIsReady(true);
        return;
      }

      // For any other event, apply if there's a user
      if (nextSession?.user) {
        applySession(nextSession);
      }
      setIsReady(true);
    });

    // Restore session from storage
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      applySession(initialSession);
      setIsReady(true);
    }).catch(() => {
      if (!isMounted) return;
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      // Restore original signOut
      supabase.auth.signOut = originalSignOut;
    };
  }, []);

  const value = useMemo(() => ({ user, session, isReady }), [user, session, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
