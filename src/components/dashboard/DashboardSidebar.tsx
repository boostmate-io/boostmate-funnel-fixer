import { useState } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-boostmate.svg";
import logoBadge from "@/assets/logo-badge.png";
import { BarChart3, LayoutDashboard, LogOut, GitBranch, Settings, Library, TrendingUp, Users, ChevronsLeft, ChevronsRight, Gem, ShieldCheck, Building2, Building, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardSidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const DashboardSidebar = ({ activeModule, onModuleChange }: DashboardSidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAgency, isAppAdmin, subAccounts, activeSubAccountId, switchSubAccount, activeSubAccount, mainAccount, allMainAccounts, switchMainAccount } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: "overview", label: t("dashboard.sidebar.dashboard"), icon: LayoutDashboard },
    { id: "funnel-audit", label: t("dashboard.sidebar.funnelAudit"), icon: BarChart3 },
    { id: "offers", label: "Offers", icon: Gem },
    { id: "funnels", label: "Funnels", icon: GitBranch },
    { id: "assets-library", label: t("dashboard.sidebar.assetsLibrary"), icon: Library },
    { id: "analytics", label: t("dashboard.sidebar.analytics"), icon: TrendingUp },
    ...(isAgency ? [{ id: "outreach", label: "Outreach", icon: Send }] : []),
    ...(isAgency ? [{ id: "clients", label: t("agency.sidebar.clients"), icon: Users }] : []),
    { id: "settings", label: t("dashboard.sidebar.settings"), icon: Settings },
    ...(isAppAdmin ? [{ id: "admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("dashboard.logoutSuccess"));
    navigate("/");
  };

  // Show account switcher for agencies (multiple sub accounts) or app admins
  const showSubSwitcher = (isAgency || isAppAdmin) && subAccounts.length > 1;
  const showMainSwitcher = isAppAdmin && allMainAccounts.length > 1;

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

      {/* Admin: Main Account switcher */}
      {showMainSwitcher && !collapsed && (
        <div className="px-3 pt-2 pb-1">
          <Select value={mainAccount?.id || ""} onValueChange={switchMainAccount}>
            <SelectTrigger className="h-8 text-xs">
              <Building className="w-3.5 h-3.5 shrink-0 mr-1" />
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {allMainAccounts.map((ma) => (
                <SelectItem key={ma.id} value={ma.id} className="text-xs">
                  {ma.name} {ma.type === "agency" ? " (Agency)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sub Account / workspace switcher */}
      {showSubSwitcher && !collapsed && (
        <div className="px-3 py-1 border-b border-border">
          <Select value={activeSubAccountId || ""} onValueChange={switchSubAccount}>
            <SelectTrigger className="h-8 text-xs">
              <Building2 className="w-3.5 h-3.5 shrink-0 mr-1" />
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {subAccounts.map((sub) => (
                <SelectItem key={sub.id} value={sub.id} className="text-xs">
                  {sub.name}{sub.is_default ? " (Internal)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showMainSwitcher && collapsed && (
        <div className="px-2 py-2 border-b border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {(activeSubAccount?.name || "?")[0]?.toUpperCase()}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{activeSubAccount?.name}</p>
              {mainAccount && <p className="text-xs text-muted-foreground">{mainAccount.name}</p>}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {showSubSwitcher && !showMainSwitcher && collapsed && (
        <div className="px-2 py-2 border-b border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {(activeSubAccount?.name || "?")[0]?.toUpperCase()}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{activeSubAccount?.name}</p>
            </TooltipContent>
          </Tooltip>
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
      {/* Collapse toggle on edge — bottom */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute bottom-6 -right-3.5 w-7 h-7 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm z-10"
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
