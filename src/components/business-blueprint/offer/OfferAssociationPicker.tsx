// =============================================================================
// OfferAssociationPicker — tiny inline chip picker to associate an entry with
// zero or more offers from the current workspace. Empty selection = business-wide.
// Used in Authority & Content editors (Client Results, Testimonials,
// Authority Assets, Value Lessons).
// =============================================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Check, Package } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface OfferOption {
  id: string;
  name: string;
}

// Simple in-memory cache to avoid refetching per card.
const cache: Record<string, OfferOption[]> = {};

export function useWorkspaceOffers(): { offers: OfferOption[]; loading: boolean } {
  const { activeSubAccountId } = useWorkspace();
  const [offers, setOffers] = useState<OfferOption[]>(
    activeSubAccountId ? cache[activeSubAccountId] ?? [] : [],
  );
  const [loading, setLoading] = useState(!offers.length);

  useEffect(() => {
    if (!activeSubAccountId) return;
    if (cache[activeSubAccountId]) {
      setOffers(cache[activeSubAccountId]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("offers")
        .select("id,name")
        .eq("sub_account_id", activeSubAccountId)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const list = (data ?? []) as OfferOption[];
      cache[activeSubAccountId] = list;
      setOffers(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSubAccountId]);

  return { offers, loading };
}

interface Props {
  value: string[] | undefined;
  onChange: (next: string[]) => void;
  label?: string;
}

const OfferAssociationPicker = ({ value, onChange, label }: Props) => {
  const { offers, loading } = useWorkspaceOffers();
  const selected = value ?? [];
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  const chosenOffers = offers.filter((o) => selected.includes(o.id));
  const btnLabel =
    chosenOffers.length === 0
      ? "Business-wide"
      : chosenOffers.length === 1
        ? chosenOffers[0].name
        : `${chosenOffers.length} offers`;

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
        <Package className="w-3 h-3" /> {label ?? "Applies to offer(s)"}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs font-normal justify-start w-full max-w-xs"
            disabled={loading && offers.length === 0}
          >
            {btnLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          {offers.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">
              {loading ? "Loading offers…" : "No offers in this workspace yet."}
            </p>
          ) : (
            <div className="max-h-64 overflow-auto space-y-0.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left"
              >
                <div className="w-3.5 h-3.5 shrink-0">
                  {selected.length === 0 && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <span className="italic text-muted-foreground">Business-wide (no offer scoping)</span>
              </button>
              {offers.map((o) => {
                const active = selected.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted text-left"
                  >
                    <div className="w-3.5 h-3.5 shrink-0">
                      {active && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <span className="truncate">{o.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {chosenOffers.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {chosenOffers.map((o) => (
            <Badge key={o.id} variant="secondary" className="text-[10px]">
              {o.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfferAssociationPicker;
