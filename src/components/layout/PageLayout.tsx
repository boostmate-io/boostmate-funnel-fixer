// =============================================================================
// Design System V1 — shared page layout primitives.
//
// Every module uses the same content width, page header structure
// (title / subtitle / right-aligned actions), divider and tab pattern.
// Only true builders/editors (Funnel Designer, Copy Editor) stay full width.
// =============================================================================

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Standard application content width — wider than a narrow doc, never full bleed. */
export const PAGE_CONTAINER = "w-full max-w-[1200px] mx-auto px-6 md:px-10";

export const PageContainer = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn(PAGE_CONTAINER, className)}>{children}</div>;

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Set false when a tab bar directly follows the header (tabs own the divider). */
  divider?: boolean;
  className?: string;
}

/** Standardized page header: title, subtitle below it, actions right-aligned. */
export const PageHeader = ({
  title,
  subtitle,
  actions,
  divider = true,
  className,
}: PageHeaderProps) => (
  <div className={cn(divider && "border-b border-border", className)}>
    <div className={cn(PAGE_CONTAINER, "py-6 flex items-start justify-between gap-6 flex-wrap")}>
      <div className="min-w-0">
        <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  </div>
);

export interface PageTabItem {
  id: string;
  label: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

/** Standardized tab bar — always sits directly under the page header. */
export const PageTabs = ({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: PageTabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) => (
  <div className={cn("border-b border-border", className)}>
    <div className={cn(PAGE_CONTAINER, "flex gap-1 -mb-px overflow-x-auto")}>
      {tabs.map((tab) => {
        const isActive = value === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

/** Standardized content area below the header/tabs. */
export const PageBody = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className="flex-1 overflow-y-auto">
    <div className={cn(PAGE_CONTAINER, "py-8 space-y-6", className)}>{children}</div>
  </div>
);
