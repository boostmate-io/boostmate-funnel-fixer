// =============================================================================
// RouteChannelsManager — inline UI for one route's primary + additional
// acquisition channels via growth_architecture_channels.
// =============================================================================

import { useState } from "react";
import { Star, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  AcquisitionChannelRow,
  RouteChannelRow,
} from "@/lib/growth-architecture/hooks";

interface Props {
  routeId: string;
  channels: AcquisitionChannelRow[];
  primary: RouteChannelRow | null;
  additional: RouteChannelRow[];
  onAddAdditional: (routeId: string, channelId: string) => Promise<unknown>;
  onRemove: (rowId: string) => Promise<unknown>;
  onSetPrimary: (routeId: string, channelId: string) => Promise<unknown>;
}

const RouteChannelsManager = ({
  routeId,
  channels,
  primary,
  additional,
  onAddAdditional,
  onRemove,
  onSetPrimary,
}: Props) => {
  const [addOpen, setAddOpen] = useState(false);
  const [primaryOpen, setPrimaryOpen] = useState(false);

  const channelById = new Map(channels.map((c) => [c.id, c] as const));
  const linkedIds = new Set([
    ...(primary ? [primary.channel_id] : []),
    ...additional.map((a) => a.channel_id),
  ]);
  const availableToAdd = channels.filter((c) => !linkedIds.has(c.id));

  const primaryChannel = primary ? channelById.get(primary.channel_id) : null;

  return (
    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Acquisition channels
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* Primary */}
        {primaryChannel ? (
          <Badge
            variant="secondary"
            className="gap-1.5 pl-2 pr-1 py-1 border"
            style={primaryChannel.color ? { borderColor: primaryChannel.color, color: primaryChannel.color } : undefined}
          >
            <Star className="w-3 h-3 fill-current" />
            <span className="text-[11px] font-semibold">{primaryChannel.label}</span>
            <span className="text-[9px] uppercase tracking-wider opacity-75 ml-1">Primary</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[11px] text-muted-foreground italic">
            No primary channel
          </Badge>
        )}

        {/* Additional chips */}
        {additional.map((a) => {
          const ch = channelById.get(a.channel_id);
          if (!ch) return null;
          return (
            <Badge
              key={a.id}
              variant="outline"
              className="gap-1 pl-2 pr-0.5 py-1"
            >
              <span className="text-[11px]">{ch.label}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-4 w-4 hover:text-destructive"
                onClick={() => onRemove(a.id)}
                aria-label={`Remove ${ch.label}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          );
        })}

        {/* Add additional */}
        {availableToAdd.length > 0 && (
          <div className="inline-flex">
            {addOpen ? (
              <Select
                value=""
                onValueChange={async (v) => {
                  await onAddAdditional(routeId, v);
                  setAddOpen(false);
                }}
                open
                onOpenChange={(o) => { if (!o) setAddOpen(false); }}
              >
                <SelectTrigger className="h-6 text-[11px] w-[180px]">
                  <SelectValue placeholder="Add channel…" />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 gap-1 text-[11px] px-2"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="w-3 h-3" /> Add
              </Button>
            )}
          </div>
        )}

        {/* Change primary */}
        {channels.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex ml-1">
                {primaryOpen ? (
                  <Select
                    value={primary?.channel_id ?? ""}
                    onValueChange={async (v) => {
                      await onSetPrimary(routeId, v);
                      setPrimaryOpen(false);
                    }}
                    open
                    onOpenChange={(o) => { if (!o) setPrimaryOpen(false); }}
                  >
                    <SelectTrigger className="h-6 text-[11px] w-[180px]">
                      <SelectValue placeholder="Promote channel…" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.label}{primary?.channel_id === c.id ? " (current)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 gap-1 text-[11px] px-2 text-muted-foreground"
                    onClick={() => setPrimaryOpen(true)}
                  >
                    Change primary
                  </Button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>Only one primary channel per route.</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default RouteChannelsManager;
