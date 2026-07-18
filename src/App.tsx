import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import InviteRegistration from "./pages/InviteRegistration.tsx";
import SharedFunnel from "./pages/SharedFunnel.tsx";
import SharedAnalytics from "./pages/SharedAnalytics.tsx";
import SharedBrief from "./pages/SharedBrief.tsx";
import SharedOffer from "./pages/SharedOffer.tsx";
import SharedBlueprint from "./pages/SharedBlueprint.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";

const queryClient = new QueryClient();

const WithAuth = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WithAuth><Index /></WithAuth>} />
          <Route path="/invite/:code" element={<InviteRegistration />} />
          <Route path="/shared/:token" element={<SharedFunnel />} />
          <Route path="/analytics/:token" element={<SharedAnalytics />} />
          <Route path="/brief/:token" element={<SharedBrief />} />
          <Route path="/offer/:token" element={<SharedOffer />} />
          <Route path="/blueprint/:token" element={<SharedBlueprint />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/.lovable/oauth/consent" element={<WithAuth><OAuthConsent /></WithAuth>} />
          <Route path="/dashboard" element={
            <WithAuth>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </WithAuth>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
