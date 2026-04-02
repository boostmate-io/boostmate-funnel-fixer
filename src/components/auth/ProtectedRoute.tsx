import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AgencyProvider } from "@/contexts/AgencyContext";
import { ProjectProvider } from "@/contexts/ProjectContext";

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
    <AgencyProvider>
      <ProjectProvider>
        {children}
      </ProjectProvider>
    </AgencyProvider>
  );
};

export default ProtectedRoute;
