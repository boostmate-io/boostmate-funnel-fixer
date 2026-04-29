// =============================================================================
// BlueprintViewMode — read-only "presentation" view of a Business Blueprint.
// Used both inside the dashboard (View Blueprint button) and on the public
// shared page (/blueprint/:token).
//
// Renders all completed sections as a continuous strategic document, similar
// in feel to a Notion page or a consulting deliverable.
// =============================================================================

import { useMemo } from "react";
import {
  ArrowLeft, Sparkles, Users, Package, Workflow, Megaphone,
  TrendingUp, DollarSign, Lightbulb, Layers, Network, Target,
  AlertTriangle, ArrowRightLeft, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrencySymbol } from "@/lib/currency";
import type { CustomerClarityData } from "./types";
import {
  type OfferDesignData, buildPromisePreview, TIMEFRAME_LABELS,
} from "./offerDesignTypes";
import {
  type GrowthSystemData, type FunnelMappingRow, getFunnelTypeLabel,
} from "./growthSystemTypes";
import { getBusinessType } from "./businessTypes";
import type { EcosystemOfferRow } from "./useEcosystemOffers";

interface WorkspaceLite {
  business_type?: string;
  currency?: string;
  help_achieve?: string;
  who_help?: string;
  main_goal?: string;
  biggest_challenge?: string;
}

interface Props {
  workspaceName?: string;
  workspace: WorkspaceLite;
  clarity: CustomerClarityData;
  offer: OfferDesignData;
  growth: GrowthSystemData;
  mappings: FunnelMappingRow[];
  offers: EcosystemOfferRow[];
  /** When set, shows a "Back" button calling this. */
  onBack?: () => void;
  onShare?: () => void;
  isPublic?: boolean;
}

// ---------- Tiny presentation helpers ---------------------------------------

const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <section className="mb-12 scroll-mt-24">
    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-3xl font-display font-bold text-foreground">{title}</h2>
    </div>
    <div className="space-y-8">{children}</div>
  </section>
);

const SubBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-xl font-display font-semibold text-foreground mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Field = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value || !value.toString().trim()) return null;
  // Detect bullet-style content (lines starting with `- `)
  const lines = value.split(/\r?\n/);
  const isBulletBlock = lines.filter((l) => l.trim().length).every((l) => /^\s*-\s+/.test(l));
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      {isBulletBlock ? (
        <ul className="space-y-1 text-[15px] text-foreground/90 leading-relaxed">
          {lines
            .map((l) => l.replace(/^\s*-\s+/, "").trim())
            .filter(Boolean)
            .map((l, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{l}</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {value}
        </p>
      )}
    </div>
  );
};

const KeyValueGrid = ({
  items,
}: {
  items: { label: string; value?: string | null }[];
}) => {
  const present = items.filter((i) => i.value && i.value.toString().trim());
  if (present.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {present.map((it) => (
        <div key={it.label} className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {it.label}
          </p>
          <p className="text-sm text-foreground/90 break-words">{it.value}</p>
        </div>
      ))}
    </div>
  );
};

// ---------- Main view -------------------------------------------------------

const BlueprintViewMode = ({
  workspaceName,
  workspace,
  clarity,
  offer,
  growth,
  mappings,
  offers,
  onBack,
  onShare,
  isPublic,
}: Props) => {
  const bt = getBusinessType(workspace.business_type);
  const cur = getCurrencySymbol(workspace.currency);
  const offerName = (id?: string | null) =>
    id ? offers.find((o) => o.id === id)?.name : undefined;

  const promise = useMemo(
    () => buildPromisePreview(offer.angle?.core_promise),
    [offer.angle?.core_promise],
  );

  const corePrice =
    typeof offer.pricing?.core_price === "number" && offer.pricing.core_price > 0
      ? `${cur}${offer.pricing.core_price.toLocaleString()}`
      : undefined;

  const ecosystemByTier = useMemo(() => {
    const tiers: Record<string, EcosystemOfferRow[]> = {};
    offers.forEach((o) => {
      const tier = o.tier || "core";
      tiers[tier] = tiers[tier] || [];
      tiers[tier].push(o);
    });
    return tiers;
  }, [offers]);

  const tierLabels: Record<string, string> = {
    free: "Free Offers",
    low_ticket: "Low Ticket",
    mid_ticket: "Mid Ticket",
    core: "Core Offer",
    premium: "Premium",
    continuity: "Continuity",
  };

  return (
    <div className="h-full overflow-y-auto bg-background-dashboard">
      {/* Top bar */}
      <div className="sticky top-0 z-10 backdrop-blur bg-card/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-display font-bold text-foreground">
              Business Blueprint
            </span>
            {isPublic && (
              <Badge variant="secondary" className="text-[10px]">Read-only</Badge>
            )}
          </div>
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5 h-8">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          )}
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-8 py-12">
        {/* Document title */}
        <header className="mb-12 pb-8 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Strategic Blueprint
          </p>
          <h1 className="text-5xl font-display font-bold text-foreground mb-3 leading-tight">
            {workspaceName || offer.angle?.main_offer_name || "Business Blueprint"}
          </h1>
          {offer.angle?.short_description && (
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {offer.angle.short_description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{bt.label}</Badge>
            {workspace.main_goal && (
              <Badge variant="outline">Goal: {workspace.main_goal}</Badge>
            )}
          </div>
        </header>

        {/* ============= BUSINESS OVERVIEW ============= */}
        <Section title="Business Overview" icon={Sparkles}>
          <KeyValueGrid
            items={[
              { label: "Business Name", value: workspaceName },
              { label: "Business Type", value: bt.label },
              { label: "Niche / Audience", value: workspace.who_help },
              { label: "Main Goal", value: workspace.main_goal },
              { label: "Biggest Challenge", value: workspace.biggest_challenge },
              { label: "What we help achieve", value: workspace.help_achieve },
            ]}
          />
        </Section>

        {/* ============= CUSTOMER CLARITY ============= */}
        <Section title="Customer Clarity" icon={Users}>
          <SubBlock title="Ideal Client Avatar">
            <Field label="Who is your ideal client" value={clarity.avatar_who} />
            <Field label="Their current stage" value={clarity.avatar_stage} />
            <Field label="Defining traits" value={clarity.avatar_traits} />
            <Field label="Not a fit" value={clarity.avatar_not_fit} />
          </SubBlock>

          <SubBlock title="Pain & Friction">
            <Field label="Main problem" value={clarity.pain_main_problem} />
            <Field label="Daily frustrations" value={clarity.pain_daily_frustrations} />
            <Field label="What they have already tried" value={clarity.pain_already_tried} />
            <Field label="Consequences of inaction" value={clarity.pain_consequences} />
          </SubBlock>

          <SubBlock title="Desire & Goals">
            <Field label="Main result they want" value={clarity.desire_main_result} />
            <Field label="What success looks like" value={clarity.desire_success_vision} />
            <Field label="Why they want it badly" value={clarity.desire_why_badly} />
          </SubBlock>

          <SubBlock title="Transformation">
            <Field label="Where they are now (Point A)" value={clarity.transformation_point_a} />
            <Field label="Where they want to be (Point B)" value={clarity.transformation_point_b} />
            <Field label="The transformation process" value={clarity.transformation_process} />
          </SubBlock>
        </Section>

        {/* ============= OFFER DESIGN ============= */}
        <Section title="Offer Design" icon={Package}>
          <SubBlock title="Offer Angle">
            <KeyValueGrid
              items={[
                { label: "Main offer", value: offer.angle?.main_offer_name },
                { label: "Core outcome", value: offer.angle?.core_outcome },
                { label: "Core promise", value: promise },
              ]}
            />
            <Field label="Short description" value={offer.angle?.short_description} />
            <Field label="New vehicle" value={offer.angle?.angle_new_vehicle} />
            <Field label="Better results" value={offer.angle?.angle_better_results} />
            <Field label="Faster outcome" value={offer.angle?.angle_faster_outcome} />
            <Field label="Easier process" value={offer.angle?.angle_easier_process} />
            {offer.angle?.framework?.name && (
              <div className="rounded-lg border border-border bg-card px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Signature framework
                </p>
                <p className="text-base font-semibold text-foreground mb-1">
                  {offer.angle.framework.name}
                </p>
                {offer.angle.framework.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {offer.angle.framework.description}
                  </p>
                )}
                {(offer.angle.framework.pillars?.length ?? 0) > 0 && (
                  <ol className="space-y-1.5 text-sm">
                    {offer.angle.framework.pillars.map((p, i) => (
                      <li key={p.id} className="flex gap-2">
                        <span className="text-primary font-semibold">{i + 1}.</span>
                        <span>
                          <span className="font-medium text-foreground">{p.name}</span>
                          {p.description && (
                            <span className="text-muted-foreground"> — {p.description}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </SubBlock>

          <SubBlock title="Offer Stack">
            {(offer.stack?.deliverables?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Deliverables
                </p>
                <div className="space-y-2">
                  {offer.stack.deliverables.map((d) => (
                    <div key={d.id} className="rounded-lg border border-border bg-card px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{d.name}</p>
                      {d.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{d.description}</p>
                      )}
                      {(d.delivery_types?.length ?? 0) > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {d.delivery_types!.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(offer.stack?.bonuses?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Bonuses
                </p>
                <div className="space-y-2">
                  {offer.stack.bonuses.map((b) => (
                    <div key={b.id} className="rounded-lg border border-border bg-card px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{b.name}</p>
                      {b.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{b.description}</p>
                      )}
                      {b.perceived_value && (
                        <p className="text-xs text-primary mt-1">{b.perceived_value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(offer.stack?.milestones?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Milestones
                </p>
                <ol className="space-y-1.5 text-sm">
                  {offer.stack.milestones.map((m, i) => (
                    <li key={m.id} className="flex gap-2">
                      <span className="text-primary font-semibold">{i + 1}.</span>
                      <span>
                        <span className="font-medium text-foreground">{m.phase_name}</span>
                        {m.expected_outcome && (
                          <span className="text-muted-foreground"> — {m.expected_outcome}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {offer.stack?.delivery_timeline && (
              <div className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Delivery Timeline
                </p>
                <p className="text-sm text-foreground">
                  {offer.stack.delivery_timeline === "custom"
                    ? offer.stack.delivery_timeline_custom
                    : TIMEFRAME_LABELS[offer.stack.delivery_timeline]}
                </p>
              </div>
            )}
          </SubBlock>

          <SubBlock title="Pricing">
            <KeyValueGrid
              items={[
                { label: "Core price", value: corePrice },
                {
                  label: "Payment plans",
                  value:
                    offer.pricing?.payment_plans?.length
                      ? `${offer.pricing.payment_plans.length} options`
                      : undefined,
                },
                {
                  label: "Premium upgrade",
                  value: offer.pricing?.premium_enabled
                    ? `${offer.pricing?.premium_upgrade?.name ?? "Enabled"}${
                        typeof offer.pricing?.premium_upgrade?.price === "number"
                          ? ` — ${cur}${offer.pricing.premium_upgrade.price.toLocaleString()}`
                          : ""
                      }`
                    : undefined,
                },
                {
                  label: "Recurring",
                  value: offer.pricing?.recurring_enabled
                    ? `${offer.pricing?.recurring_offer?.name ?? "Enabled"}${
                        typeof offer.pricing?.recurring_offer?.monthly_price === "number"
                          ? ` — ${cur}${offer.pricing.recurring_offer.monthly_price.toLocaleString()}/mo`
                          : ""
                      }`
                    : undefined,
                },
                {
                  label: "Guarantee",
                  value:
                    offer.pricing?.guarantee_type && offer.pricing.guarantee_type !== "none"
                      ? offer.pricing.guarantee_type.replace(/_/g, " ")
                      : undefined,
                },
              ]}
            />
            <Field label="Guarantee details" value={offer.pricing?.guarantee_details} />
          </SubBlock>

          <SubBlock title="Offer Ecosystem">
            {Object.keys(ecosystemByTier).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No ecosystem offers defined yet.
              </p>
            ) : (
              ["free", "low_ticket", "mid_ticket", "core", "premium", "continuity"]
                .filter((t) => ecosystemByTier[t]?.length)
                .map((t) => (
                  <div key={t}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {tierLabels[t]}
                    </p>
                    <div className="space-y-2">
                      {ecosystemByTier[t].map((o) => (
                        <div key={o.id} className="rounded-lg border border-border bg-card px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">{o.name}</p>
                            {typeof o.data?.price === "number" && o.data.price > 0 && (
                              <Badge variant="secondary" className="text-xs tabular-nums">
                                {cur}{o.data.price.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          {o.data?.description && (
                            <p className="text-sm text-muted-foreground mt-1">{o.data.description}</p>
                          )}
                          {o.data?.core_outcome && (
                            <p className="text-xs text-primary mt-1">→ {o.data.core_outcome}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </SubBlock>
        </Section>

        {/* ============= GROWTH SYSTEM ============= */}
        <Section title="Growth System" icon={Workflow}>
          <SubBlock title="Acquisition">
            <KeyValueGrid
              items={[
                {
                  label: "Traffic sources",
                  value: growth.acquisition?.traffic_sources?.join(", "),
                },
                {
                  label: "Primary entry offer",
                  value: offerName(growth.acquisition?.primary_entry_offer_id),
                },
                {
                  label: "Lead capture method",
                  value: growth.acquisition?.lead_capture_method,
                },
              ]}
            />
          </SubBlock>

          <SubBlock title="Funnel Architecture">
            {mappings.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No funnel mappings defined yet.
              </p>
            ) : (
              <div className="space-y-3">
                {mappings.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-semibold text-foreground">
                        {offerName(m.offer_id) ?? "Untitled offer"}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">{getFunnelTypeLabel(m.funnel_type)}</Badge>
                      {m.next_offer_id && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-foreground/80">{offerName(m.next_offer_id)}</span>
                        </>
                      )}
                    </div>
                    {m.purpose && (
                      <p className="text-xs text-muted-foreground mt-1.5">{m.purpose}</p>
                    )}
                    {(m.traffic_sources?.length ?? 0) > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.traffic_sources.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SubBlock>

          <SubBlock title="Ascension">
            <KeyValueGrid
              items={[
                {
                  label: "Next offer after core",
                  value: offerName(growth.ascension?.next_offer_after_core_id),
                },
                {
                  label: "Retention offer",
                  value: offerName(growth.ascension?.retention_offer_id),
                },
                {
                  label: "Referrals",
                  value: growth.ascension?.referral_enabled ? "Enabled" : undefined,
                },
                {
                  label: "Reactivation",
                  value: growth.ascension?.reactivation_enabled ? "Enabled" : undefined,
                },
              ]}
            />
            <Field
              label="Referral mechanic"
              value={growth.ascension?.referral_description}
            />
            <Field
              label="Reactivation mechanic"
              value={growth.ascension?.reactivation_description}
            />
          </SubBlock>
        </Section>

        <footer className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          Strategic Business Blueprint · Generated with Boostmate
        </footer>
      </article>
    </div>
  );
};

export default BlueprintViewMode;
