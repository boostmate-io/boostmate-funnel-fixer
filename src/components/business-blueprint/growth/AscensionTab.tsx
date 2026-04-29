// =============================================================================
// AscensionTab — Tab 3: how buyers move through the ecosystem.
// =============================================================================

import { TrendingUp, ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AscensionData } from "../growthSystemTypes";
import type { EcosystemOfferRow } from "../useEcosystemOffers";

interface Props {
  data: AscensionData;
  onChange: (patch: Partial<AscensionData>) => void;
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

const TIERS_IN_ORDER: { tier: string; label: string }[] = [
  { tier: "free", label: "Free" },
  { tier: "low_ticket", label: "Low Ticket" },
  { tier: "mid_ticket", label: "Mid Ticket" },
  { tier: "core", label: "Core" },
  { tier: "premium", label: "Premium" },
  { tier: "continuity", label: "Continuity" },
];

const AscensionTab = ({ data, onChange, offers }: Props) => {
  const continuityOffers = offers.filter((o) => o.tier === "continuity");
  const upgradeOffers = offers.filter((o) =>
    ["mid_ticket", "premium", "continuity"].includes(o.tier),
  );

  return (
    <div className="space-y-5">
      <SectionShell
        title="Next Offer After Core Offer"
        description="What you upgrade buyers into after the core program."
      >
        <Select
          value={data.next_offer_after_core_id || "_none"}
          onValueChange={(v) =>
            onChange({ next_offer_after_core_id: v === "_none" ? undefined : v })
          }
        >
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Choose an offer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None yet</SelectItem>
            {upgradeOffers.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                <span className="text-xs uppercase text-muted-foreground mr-2">
                  {o.tier.replace("_", " ")}
                </span>
                {o.name || "Untitled"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionShell>

      <SectionShell
        title="Retention Offer"
        description="The continuity offer that keeps clients in your ecosystem long-term."
      >
        {continuityOffers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No continuity offers yet. Add one in <span className="font-medium text-foreground">Offer Design → Ecosystem</span>.
          </div>
        ) : (
          <Select
            value={data.retention_offer_id || "_none"}
            onValueChange={(v) =>
              onChange({ retention_offer_id: v === "_none" ? undefined : v })
            }
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choose continuity offer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None yet</SelectItem>
              {continuityOffers.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name || "Untitled"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </SectionShell>

      <SectionShell title="Referral System" description="Do you have a referral mechanism?">
        <div className="flex items-center gap-3 mb-3">
          <Switch
            checked={data.referral_enabled}
            onCheckedChange={(v) => onChange({ referral_enabled: v })}
          />
          <span className="text-sm text-foreground">
            {data.referral_enabled ? "Yes" : "No"}
          </span>
        </div>
        {data.referral_enabled && (
          <AutoTextarea
            value={data.referral_description || ""}
            onChange={(e) => onChange({ referral_description: e.target.value })}
            placeholder="How do clients refer others? e.g. Affiliate link, in-product share, referral bonus."
            rows={2}
            className="text-sm"
          />
        )}
      </SectionShell>

      <SectionShell title="Reactivation System" description="Do inactive leads/customers re-enter your ecosystem?">
        <div className="flex items-center gap-3 mb-3">
          <Switch
            checked={data.reactivation_enabled}
            onCheckedChange={(v) => onChange({ reactivation_enabled: v })}
          />
          <span className="text-sm text-foreground">
            {data.reactivation_enabled ? "Yes" : "No"}
          </span>
        </div>
        {data.reactivation_enabled && (
          <AutoTextarea
            value={data.reactivation_description || ""}
            onChange={(e) => onChange({ reactivation_description: e.target.value })}
            placeholder="How do inactive leads/customers re-enter your ecosystem? e.g. Win-back campaign, free workshop."
            rows={2}
            className="text-sm"
          />
        )}
      </SectionShell>

      {/* Ascension Flow Preview */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wide text-primary">
            Ascension Flow Preview
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TIERS_IN_ORDER.map((t, i) => {
            const offerInTier = offers.find((o) => o.tier === t.tier);
            return (
              <div key={t.tier} className="flex items-center gap-2">
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    offerInTier
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-dashed border-border text-muted-foreground/70"
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {t.label}
                  </div>
                  <div className="line-clamp-1 max-w-[140px]">
                    {offerInTier?.name || "Empty"}
                  </div>
                </div>
                {i < TIERS_IN_ORDER.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AscensionTab;
