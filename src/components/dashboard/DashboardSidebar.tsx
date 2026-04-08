import { useState } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-boostmate.svg";
import logoBadge from "@/assets/logo-badge.png";
import { BarChart3, LayoutDashboard, LogOut, GitBranch, Settings, Library, TrendingUp, Users, ChevronsLeft, ChevronsRight, Gem } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProjectSwitcher from "./ProjectSwitcher";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardSidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const DashboardSidebar = ({ activeModule, onModuleChange }: DashboardSidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAgency, impersonatedUserId } = useAgency();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: "overview", label: t("dashboard.sidebar.dashboard"), icon: LayoutDashboard },
    { id: "funnel-audit", label: t("dashboard.sidebar.funnelAudit"), icon: BarChart3 },
    { id: "offers", label: "Offers", icon: Gem },
    { id: "funnels", label: "Funnels", icon: GitBranch },
    { id: "assets-library", label: t("dashboard.sidebar.assetsLibrary"), icon: Library },
    { id: "analytics", label: t("dashboard.sidebar.analytics"), icon: TrendingUp },
    ...(isAgency && !impersonatedUserId ? [{ id: "clients", label: t("agency.sidebar.clients"), icon: Users }] : []),
    { id: "settings", label: t("dashboard.sidebar.settings"), icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("dashboard.logoutSuccess"));
    navigate("/");
  };

  const NavButton = ({ item }: { item: typeof navItems[0] }) => {
    const btn = (
      <button
        onClick={() => onModuleChange(item.id)}
        className={`w-full flex items-center ${collapsed ? "justify-center" : ""} gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          activeModule === item.id
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        }`}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {!collapsed && item.label}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return btn;
  };

  return (
    <aside className={`${collapsed ? "w-16" : "w-64"} h-screen bg-card border-r border-border flex flex-col shrink-0 transition-all duration-200 relative`}>
      <div className={`${collapsed ? "p-3 flex justify-center" : "p-6"} border-b border-border`}>
        {collapsed ? (
          <img src={logoBadge} alt="Boostmate" className="h-8 w-8 rounded-lg" />
        ) : (
          <img src={logo} alt="Boostmate" className="h-7" />
        )}
      </div>
      {!collapsed && (
        <div className="border-b border-border">
          <ProjectSwitcher />
        </div>
      )}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </nav>
      <div className="p-2 border-t border-border">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("dashboard.sidebar.logout")}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t("dashboard.sidebar.logout")}
          </button>
        )}
      </div>
      {/* Collapse toggle on edge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm z-10"
          >
            {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{collapsed ? t("dashboard.sidebar.expand") : t("dashboard.sidebar.collapse")}</TooltipContent>
      </Tooltip>
    </aside>
  );
};

export default DashboardSidebar;
