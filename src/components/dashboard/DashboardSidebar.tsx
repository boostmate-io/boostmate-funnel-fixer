import { useState } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-boostmate.svg";
import logoBadge from "@/assets/logo-badge.png";
import { BarChart3, LayoutDashboard, GitBranch, Settings, TrendingUp, Users, ChevronsLeft, ChevronsRight, Sparkles, ShieldCheck, Building2, Building, Send, FileText, Zap, Puzzle, Milestone, ChevronDown, ChevronRight, Package, Workflow, Palette, Award, Network } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardSidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const adminSubItems = [
  { id: "admin-accounts", label: "Accounts", icon: Building2 },
  { id: "admin-ai", label: "AI", icon: Zap },
  { id: "admin-copy", label: "Copy", icon: Puzzle },
  { id: "admin-growth", label: "Growth Roadmap", icon: Milestone },
];

const blueprintSubItems: { id: "customer-clarity" | "offer-design" | "brand-strategy" | "proof-authority"; label: string; icon: typeof Users }[] = [
  { id: "customer-clarity", label: "Customer Clarity", icon: Users },
  { id: "offer-design", label: "Offer Design", icon: Package },
  { id: "brand-strategy", label: "Brand Strategy", icon: Palette },
  { id: "proof-authority", label: "Authority & Content", icon: Award },
];


const DashboardSidebar = ({ activeModule, onModuleChange }: DashboardSidebarProps) => {
  const { t } = useTranslation();
  const { isAgency, isAppAdmin, subAccounts, activeSubAccountId, switchSubAccount, activeSubAccount, mainAccount, allMainAccounts, switchMainAccount } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [adminOpen, setAdminOpen] = useState(activeModule.startsWith("admin"));
  const [blueprintOpen, setBlueprintOpen] = useState(activeModule === "business-blueprint");

  const isAdminActive = activeModule.startsWith("admin");

  const navItems = [
    { id: "overview", label: t("dashboard.sidebar.dashboard"), icon: LayoutDashboard },
    { id: "growth-roadmap", label: t("growth.sidebar"), icon: TrendingUp },
    { id: "business-blueprint", label: "Business Blueprint", icon: Sparkles },
    { id: "growth-architecture", label: "Growth Architecture", icon: Network },
    { id: "funnels", label: "Funnels", icon: GitBranch },
    { id: "copy-documents", label: t("dashboard.sidebar.copyDocuments"), icon: FileText },
    { id: "analytics", label: t("dashboard.sidebar.analytics"), icon: BarChart3 },
    ...(isAgency ? [{ id: "outreach", label: "Outreach", icon: Send }] : []),
    ...(isAgency ? [{ id: "clients", label: t("agency.sidebar.clients"), icon: Users }] : []),
    { id: "settings", label: t("dashboard.sidebar.settings"), icon: Settings },
  ];

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
      <div className={`${collapsed ? "p-3 flex justify-center" : "px-6 py-4"}`}>
        {collapsed ? (
          <img src={logoBadge} alt="Boostmate" className="h-8 w-8 rounded-lg" />
        ) : (
          <img src={logo} alt="Boostmate" className="h-7" />
        )}
      </div>


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

      <nav className="flex-1 px-2 pb-2 pt-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isBlueprint = item.id === "business-blueprint";
          if (isBlueprint && !collapsed) {
            const isActive = activeModule === "business-blueprint";
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (!isActive) {
                      onModuleChange(item.id);
                      setBlueprintOpen(true);
                      return;
                    }
                    setBlueprintOpen((o) => !o);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {blueprintOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {blueprintOpen && isActive && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {blueprintSubItems.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("boostmate:blueprint-navigate-section", {
                              detail: { section: sub.id },
                            }),
                          );
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/30 transition-colors"
                      >
                        <sub.icon className="w-3.5 h-3.5 shrink-0" />
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div key={item.id}>
              <NavButton item={item} />
            </div>
          );
        })}

        {/* Admin with submenu */}
        {isAppAdmin && (
          <div>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (!isAdminActive) onModuleChange("admin-accounts");
                      setAdminOpen(!adminOpen);
                    }}
                    className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isAdminActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Admin</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAdminOpen(!adminOpen);
                    if (!adminOpen && !isAdminActive) onModuleChange("admin-accounts");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isAdminActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span className="flex-1 text-left">Admin</span>
                  {adminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {adminOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {adminSubItems.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => onModuleChange(sub.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeModule === sub.id
                            ? "bg-sidebar-accent/70 text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30"
                        }`}
                      >
                        <sub.icon className="w-4 h-4 shrink-0" />
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </nav>


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
