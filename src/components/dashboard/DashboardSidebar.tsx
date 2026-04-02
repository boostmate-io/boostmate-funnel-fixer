import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-boostmate.svg";
import { BarChart3, LayoutDashboard, LogOut, PenTool, Settings, Library, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProjectSwitcher from "./ProjectSwitcher";
import { useAgency } from "@/contexts/AgencyContext";

interface DashboardSidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const DashboardSidebar = ({ activeModule, onModuleChange }: DashboardSidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAgency, impersonatedUserId } = useAgency();

  const navItems = [
    { id: "overview", label: t("dashboard.sidebar.dashboard"), icon: LayoutDashboard },
    ...(isAgency && !impersonatedUserId ? [{ id: "clients", label: t("agency.sidebar.clients"), icon: Users }] : []),
    { id: "funnel-audit", label: t("dashboard.sidebar.funnelAudit"), icon: BarChart3 },
    { id: "funnel-designer", label: t("dashboard.sidebar.funnelDesigner"), icon: PenTool },
    { id: "analytics", label: t("dashboard.sidebar.analytics"), icon: TrendingUp },
    { id: "assets-library", label: t("dashboard.sidebar.assetsLibrary"), icon: Library },
    { id: "settings", label: t("dashboard.sidebar.settings"), icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("dashboard.logoutSuccess"));
    navigate("/");
  };

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col shrink-0">
      <div className="p-6 border-b border-border">
        <img src={logo} alt="Boostmate" className="h-7" />
      </div>
      <div className="border-b border-border">
        <ProjectSwitcher />
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onModuleChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeModule === item.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {t("dashboard.sidebar.logout")}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
