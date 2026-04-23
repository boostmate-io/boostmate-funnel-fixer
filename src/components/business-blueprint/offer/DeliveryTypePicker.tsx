// =============================================================================
// DeliveryTypePicker — multi-select with categorized library + custom additions.
// Used everywhere a user picks delivery types (deliverables, ecosystem cards,
// recurring offer, resource cards).
// =============================================================================

import { useState, useMemo } from "react";
import { Check, Plus, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DELIVERY_LIBRARY, DELIVERY_LIBRARY_FLAT } from "../offerDesignTypes";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  triggerClassName?: string;
  emptyLabel?: string;
}

const DeliveryTypePicker = ({
  value,
  onChange,
  placeholder = "Pick delivery types…",
  triggerClassName,
  emptyLabel = "No delivery types selected",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftCustom, setDraftCustom] = useState("");

  const filteredLibrary = useMemo(() => {
    if (!search.trim()) return DELIVERY_LIBRARY;
    const q = search.toLowerCase();
    return DELIVERY_LIBRARY
      .map((cat) => ({ ...cat, items: cat.items.filter((i) => i.toLowerCase().includes(q)) }))
      .filter((c) => c.items.length > 0);
  }, [search]);

  const customExtras = value.filter((v) => !DELIVERY_LIBRARY_FLAT.includes(v));

  const toggle = (item: string) => {
    if (value.includes(item)) onChange(value.filter((v) => v !== item));
    else onChange([...value, item]);
  };

  const commitCustom = () => {
    const v = draftCustom.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraftCustom("");
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full min-h-9 rounded-md border border-input bg-background px-3 py-2 text-sm text-left flex items-center justify-between gap-2 hover:border-primary/50 transition-colors",
              triggerClassName,
            )}
          >
            <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
              {value.length === 0
                ? placeholder
                : `${value.length} selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[360px] max-w-[90vw]" align="start">
          <div className="p-2 border-b border-border">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search delivery types…"
              className="h-8 text-sm"
            />
          </div>
          <ScrollArea className="h-72">
            <div className="p-2 space-y-3">
              {filteredLibrary.map((cat) => (
                <div key={cat.id}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1.5 mb-1">
                    {cat.label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => {
                      const active = value.includes(item);
                      return (
                        <button
                          type="button"
                          key={item}
                          onClick={() => toggle(item)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary/50",
                          )}
                        >
                          {active && <Check className="w-3 h-3" />}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredLibrary.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-1.5 py-4 text-center">
                  No matches. Add a custom type below.
                </p>
              )}
            </div>
          </ScrollArea>
          <div className="border-t border-border p-2 flex items-center gap-2">
            <Input
              value={draftCustom}
              onChange={(e) => setDraftCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                }
              }}
              placeholder="Add custom…"
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={commitCustom} disabled={!draftCustom.trim()} className="h-8 gap-1">
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={v}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                customExtras.includes(v)
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-primary/10 text-primary",
              )}
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="hover:opacity-70"
                aria-label={`Remove ${v}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">{emptyLabel}</p>
      )}
    </div>
  );
};

export default DeliveryTypePicker;
