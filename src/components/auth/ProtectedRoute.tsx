import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isReady } = useAuth();

  if (!isReady) {
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
