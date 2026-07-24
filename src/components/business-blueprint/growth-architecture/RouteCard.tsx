// =============================================================================
// RouteCard — V5 redesigned route summary card.
// Presentational component; no backend logic.
// =============================================================================

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Pencil,
  Rocket,
  Trash2,
  ArrowRight,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import RouteChannelsManager from "./RouteChannelsManager";
import { ROUTE_STATE_STYLES, type DerivedRouteMeta } from "@/lib/growth-architecture/deriveStatus";
import type {
  AcquisitionChannelRow,
  RouteChannelRow,
} from "@/lib/growth-architecture/hooks";

interface Props {
  routeId: string;
  systemLabel: string;
  sourceLabel: string; // "External acquisition" or offer name
  targetLabel: string;
  derived: DerivedRouteMeta;
  primary: RouteChannelRow | null;
  additional: RouteChannelRow[];
  channels: AcquisitionChannelRow[];
  funnelName: string | null;
  hasFunnel: boolean;
  buildProgress: { active: number; completed: number; guideCount: number } | null;
  notes: string | null;
  isBusy: boolean;
  canStart: boolean;
  onStartBuilding: () => void;
  onOpenFunnel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddAdditional: (routeId: string, channelId: string) => Promise<unknown>;
  onRemoveChannel: (rowId: string) => Promise<unknown>;
  onSetPrimary: (routeId: string, channelId: string) => Promise<unknown>;
}

const RouteCard = ({
  routeId,
  systemLabel,
  sourceLabel,
  targetLabel,
  derived,
  primary,
  additional,
  channels,
  funnelName,
  hasFunnel,
  buildProgress,
  notes,
  isBusy,
  canStart,
  onStartBuilding,
  onOpenFunnel,
  onEdit,
  onDelete,
  onAddAdditional,
  onRemoveChannel,
  onSetPrimary,
}: Props) => {
  const [channelsOpen, setChannelsOpen] = useState(false);

  const primaryChannel = primary ? channels.find((c) => c.id === primary.channel_id) : null;
  const additionalCount = additional.length;
  const pct = buildProgress && buildProgress.active > 0
    ? Math.round((buildProgress.completed / buildProgress.active) * 100)
    : null;

  return (
    <div className="rounded-lg border border-border bg-background hover:border-border/80 transition-colors">
      {/* Header row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Summary */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* State + system title */}
            <div className="flex items-center gap-2 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={`text-[10px] ${ROUTE_STATE_STYLES[derived.state]}`} variant="secondary">
                    {derived.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{derived.reason}</TooltipContent>
              </Tooltip>
              <span className="text-sm font-semibold truncate">{systemLabel}</span>
            </div>

            {/* Source -> System -> Target chain */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="truncate max-w-[180px]">{sourceLabel}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[180px] text-foreground/80">{systemLabel}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[180px] text-foreground font-medium">{targetLabel}</span>
            </div>

            {/* Channels + funnel meta */}
            <div className="flex items-center gap-3 flex-wrap text-[11px]">
              {primaryChannel ? (
                <span
                  className="inline-flex items-center gap-1 text-foreground"
                  style={primaryChannel.color ? { color: primaryChannel.color } : undefined}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span className="font-medium">{primaryChannel.label}</span>
                </span>
              ) : (
                <span className="text-muted-foreground italic">No primary channel</span>
              )}
              {additionalCount > 0 && (
                <span className="text-muted-foreground">+{additionalCount} additional</span>
              )}
              {hasFunnel && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                  <span className="truncate max-w-[220px]">Funnel: <span className="text-foreground">{funnelName ?? "Untitled"}</span></span>
                </span>
              )}
            </div>

            {/* Build progress */}
            {hasFunnel && buildProgress && buildProgress.active > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <Progress value={pct ?? 0} className="h-1.5 flex-1 max-w-[240px]" />
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {buildProgress.completed}/{buildProgress.active} tasks
                </span>
              </div>
            )}

            {notes && <div className="text-[11px] text-muted-foreground italic pt-1">{notes}</div>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {hasFunnel ? (
              <Button size="sm" variant="outline" onClick={onOpenFunnel} className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Open Funnel
              </Button>
            ) : canStart ? (
              <Button size="sm" onClick={onStartBuilding} disabled={isBusy} className="gap-1.5">
                {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                Start Building
              </Button>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit route</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete route</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Collapsible channels section */}
        <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen} className="mt-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px] px-2 text-muted-foreground hover:text-foreground"
            >
              {channelsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Manage acquisition channels
              {(primary || additionalCount > 0) && (
                <span className="text-[10px] opacity-70">
                  ({(primary ? 1 : 0) + additionalCount})
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <RouteChannelsManager
              routeId={routeId}
              channels={channels}
              primary={primary}
              additional={additional}
              onAddAdditional={onAddAdditional}
              onRemove={onRemoveChannel}
              onSetPrimary={onSetPrimary}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default RouteCard;
