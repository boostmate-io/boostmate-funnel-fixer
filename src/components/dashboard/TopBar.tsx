// =============================================================================
// TopBar — global application top navigation.
//
// Right-aligned controls: Feedback, Support, Academy, Notifications, Avatar.
// The first four are intentionally inert UI placeholders for now.
// =============================================================================

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, GraduationCap, LifeBuoy, LogOut, MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface TopBarProps {
  onOpenSettings: () => void;
}

function initialsFor(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const first = typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  const last = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
  if (first || last) return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  const display = typeof meta.display_name === "string" ? meta.display_name.trim() : "";
  if (display) {
    const parts = display.split(/\s+/);
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (user?.email ?? "?").slice(0, 2).toUpperCase();
}

const TopBar = ({ onOpenSettings }: TopBarProps) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success(t("dashboard.logoutSuccess"));
    navigate("/");
  };

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) || user?.email || "";

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-end gap-2 px-4">
      <Button variant="ghost" size="sm" className="gap-2">
        <MessageSquare className="w-4 h-4" />
        Feedback
      </Button>
      <Button variant="ghost" size="sm" className="gap-2">
        <LifeBuoy className="w-4 h-4" />
        Support
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Academy">
            <GraduationCap className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Academy</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Account menu"
            className="ml-1 w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            {initialsFor(user)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <DropdownMenuLabel className="truncate font-normal text-xs text-muted-foreground">
            {displayName}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            {t("dashboard.sidebar.settings")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t("dashboard.sidebar.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default TopBar;
