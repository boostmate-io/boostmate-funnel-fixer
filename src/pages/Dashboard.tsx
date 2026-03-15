import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { BarChart3 } from "lucide-react";

const Dashboard = () => {
  const [activeModule, setActiveModule] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/");
      else setUser(session.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/");
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background-dashboard">
      <DashboardSidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <main className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {activeModule === "overview" && "Dashboard"}
            {activeModule === "funnel-audit" && "Funnel Audit"}
            {activeModule === "settings" && "Instellingen"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welkom terug, {user.email}
          </p>
        </div>

        {activeModule === "overview" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              onClick={() => setActiveModule("funnel-audit")}
              className="bg-card rounded-xl border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow text-left group"
            >
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-foreground mb-1">Funnel Audit</h3>
              <p className="text-sm text-muted-foreground">
                Analyseer en optimaliseer je sales funnel stap voor stap.
              </p>
            </button>
          </div>
        )}

        {activeModule === "funnel-audit" && (
          <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-bold text-foreground mb-2">
              Funnel Audit Module
            </h3>
            <p className="text-muted-foreground">
              Deze module wordt binnenkort uitgewerkt. Hier kun je straks een volledige audit van je funnel uitvoeren.
            </p>
          </div>
        )}

        {activeModule === "settings" && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h3 className="font-display font-bold text-foreground mb-4">Account</h3>
            <p className="text-sm text-muted-foreground">E-mail: {user.email}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
