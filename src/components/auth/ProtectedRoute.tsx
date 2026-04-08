// @refresh reset
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isReady } = useAuth();
  const hadAuthenticatedUserRef = useRef(false);
  const [allowRedirect, setAllowRedirect] = useState(false);

  useEffect(() => {
    if (!isReady) {
      setAllowRedirect(false);
      return;
    }

    if (user) {
      hadAuthenticatedUserRef.current = true;
      setAllowRedirect(false);
      return;
    }

    if (!hadAuthenticatedUserRef.current) {
      setAllowRedirect(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setAllowRedirect(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [user, isReady]);

  if (!isReady || (!user && !allowRedirect)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <WorkspaceProvider>
      {children}
    </WorkspaceProvider>
  );
};

export default ProtectedRoute;
