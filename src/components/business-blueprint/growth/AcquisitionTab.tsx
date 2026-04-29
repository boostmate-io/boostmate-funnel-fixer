// =============================================================================
// AcquisitionTab — Tab 1: how strangers enter the ecosystem.
// =============================================================================

import { Megaphone, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelectChips from "../offer/MultiSelectChips";
import {
  type AcquisitionData,
  TRAFFIC_SOURCE_OPTIONS,
  LEAD_CAPTURE_OPTIONS,
} from "../growthSystemTypes";
import type { EcosystemOfferRow } from "../useEcosystemOffers";

interface Props {
  data: AcquisitionData;
  onChange: (patch: Partial<AcquisitionData>) => void;
  offers: EcosystemOfferRow[];
}

const SectionShell = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
    <div className="mb-4">
      <h3 className="text-lg font-display font-bold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
    {children}
  </div>
);

const AcquisitionTab = ({ data, onChange, offers }: Props) => {
  const freeOffers = offers.filter((o) => o.tier === "free");
  const entryOffer = freeOffers.find((o) => o.id === data.primary_entry_offer_id);

  const trafficLabel = data.traffic_sources[0] || "Traffic source";
  const captureLabel = data.lead_capture_method || "Lead capture";

  return (
    <div className="space-y-5">
      <SectionShell
        title="Primary Traffic Sources"
        description="Where strangers first discover your brand. Multi-select."
      >
        <MultiSelectChips
          options={TRAFFIC_SOURCE_OPTIONS}
          value={data.traffic_sources}
          onChange={(next) => onChange({ traffic_sources: next })}
          allowCustom
          customPlaceholder="Add custom traffic source…"
        />
      </SectionShell>

      <SectionShell
        title="Primary Entry Offer"
        description="The free offer that turns cold traffic into a lead. Pulled from your Offer Ecosystem."
      >
        {freeOffers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No free offers yet. Add one in <span className="font-medium text-foreground">Offer Design → Ecosystem</span>.
          </div>
        ) : (
          <Select
            value={data.primary_entry_offer_id || ""}
            onValueChange={(v) => onChange({ primary_entry_offer_id: v || undefined })}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choose your entry offer" />
            </SelectTrigger>
            <SelectContent>
              {freeOffers.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name || "Untitled offer"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </SectionShell>

      <SectionShell
        title="Lead Capture Method"
        description="Where the entry offer is delivered & the lead is captured."
      >
        <div className="flex flex-wrap gap-2">
          {LEAD_CAPTURE_OPTIONS.map((opt) => {
            const active = data.lead_capture_method === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ lead_capture_method: active ? undefined : opt })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-border hover:border-primary/50"
                }`}
              >
                {opt}
              </button>
            );
          })}
          {data.lead_capture_method && !LEAD_CAPTURE_OPTIONS.includes(data.lead_capture_method) && (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground border border-primary">
              {data.lead_capture_method}
            </span>
          )}
        </div>
        <div className="mt-3">
          <Label className="text-xs text-muted-foreground">Or add a custom method</Label>
          <input
            type="text"
            placeholder="e.g. Linktree quiz, instant book"
            className="mt-1 w-full max-w-md px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) {
                  onChange({ lead_capture_method: v });
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
        </div>
      </SectionShell>

      {/* Acquisition Flow Preview */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wide text-primary">
            Acquisition Flow Preview
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <FlowChip label={trafficLabel} muted={data.traffic_sources.length === 0} />
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <FlowChip
            label={entryOffer?.name || "Free offer"}
            muted={!entryOffer}
          />
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <FlowChip label={captureLabel} muted={!data.lead_capture_method} />
        </div>
      </div>
    </div>
  );
};

const FlowChip = ({ label, muted }: { label: string; muted?: boolean }) => (
  <span
    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
      muted
        ? "border-dashed border-border text-muted-foreground/70 italic"
        : "border-primary/30 bg-primary/10 text-primary"
    }`}
  >
    {label}
  </span>
);

export default AcquisitionTab;
