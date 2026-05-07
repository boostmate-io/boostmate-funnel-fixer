// =============================================================================
// BlueprintViewMode — read-only "presentation" view of a Business Blueprint.
// Used both inside the dashboard (View Blueprint button) and on the public
// shared page (/blueprint/:token).
//
// Renders all completed sections as a continuous strategic document, similar
// in feel to a Notion page or a consulting deliverable.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, Users, Package, Workflow, Megaphone,
  TrendingUp, DollarSign, Lightbulb, Layers, Network, Target,
  AlertTriangle, ArrowRightLeft, Share2, Palette, Award, ChevronDown, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrencySymbol } from "@/lib/currency";
import type { CustomerClarityData } from "./types";
import {
  type OfferDesignData, buildPromisePreview, TIMEFRAME_LABELS,
} from "./offerDesignTypes";
import {
  type GrowthSystemData, type FunnelMappingRow, getFunnelTypeLabel,
} from "./growthSystemTypes";
import {
  type ProofAuthorityData, emptyProofAuthority,
} from "./proofAuthorityTypes";
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
  proofAuthority?: ProofAuthorityData;
  /** When set, shows a "Back" button calling this. */
  onBack?: () => void;
  onShare?: () => void;
  isPublic?: boolean;
}

// ---------- Tiny presentation helpers ---------------------------------------

const Section = ({
  id,
  title,
  icon: Icon,
  show = true,
  children,
}: {
  id?: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: boolean;
  children: React.ReactNode;
}) => {
  if (!show) return null;
  return (
    <section id={id} data-section={id} className="mb-12 scroll-mt-24 print-section">
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border print-section-header">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center print-section-icon">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-3xl font-display font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-8">{children}</div>
    </section>
  );
};

const SubBlock = ({
  title,
  show = true,
  children,
}: {
  title: string;
  show?: boolean;
  children: React.ReactNode;
}) => {
  if (!show) return null;
  return (
    <div>
      <h3 className="text-xl font-display font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

const hasText = (v?: string | null) => Boolean(v && v.toString().trim());

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
  proofAuthority,
  onBack,
  onShare,
  isPublic,
}: Props) => {
  const proof = proofAuthority ?? emptyProofAuthority();
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

  // ----- Section navigation (scroll-spy) -----
  const hasOverview = Boolean(
    workspaceName || workspace.business_type || workspace.who_help ||
    workspace.main_goal || workspace.biggest_challenge || workspace.help_achieve,
  );
  const hasClarity = Object.values(clarity || {}).some((v) => typeof v === "string" && v.trim());
  const hasOffer = Boolean(
    offer.angle?.main_offer_name || offer.angle?.core_outcome ||
    offer.angle?.short_description || offer.angle?.framework?.name ||
    (offer.stack?.deliverables?.length ?? 0) > 0 ||
    (offer.stack?.bonuses?.length ?? 0) > 0 ||
    (offer.stack?.milestones?.length ?? 0) > 0 ||
    typeof offer.pricing?.core_price === "number" ||
    offers.length > 0,
  );
  const hasGrowth = Boolean(
    (growth.acquisition?.traffic_sources?.length ?? 0) > 0 ||
    growth.acquisition?.primary_entry_offer_id ||
    growth.acquisition?.lead_capture_method ||
    mappings.length > 0 ||
    growth.ascension?.next_offer_after_core_id ||
    growth.ascension?.retention_offer_id ||
    growth.ascension?.referral_enabled ||
    growth.ascension?.reactivation_enabled,
  );

  const hasProof = Boolean(
    (proof.authority?.authority_types?.length ?? 0) > 0 ||
    (proof.authority?.credibility_foundations?.length ?? 0) > 0 ||
    (proof.authority?.trust_reason && proof.authority.trust_reason.trim()) ||
    (proof.authority?.signature_proof && proof.authority.signature_proof.trim()) ||
    (proof.authority?.founder_stories?.length ?? 0) > 0 ||
    (proof.social_proof?.metrics?.length ?? 0) > 0 ||
    (proof.social_proof?.client_results?.length ?? 0) > 0 ||
    (proof.social_proof?.testimonials?.length ?? 0) > 0 ||
    (proof.social_proof?.authority_assets?.length ?? 0) > 0 ||
    (proof.objections?.objections?.length ?? 0) > 0 ||
    (proof.educational?.lessons?.length ?? 0) > 0,
  );

  const navSections = [
    { id: "overview", label: "Overview", hasContent: hasOverview },
    { id: "customer-clarity", label: "Customer Clarity", hasContent: hasClarity },
    { id: "offer-design", label: "Offer Design", hasContent: hasOffer },
    { id: "growth-system", label: "Growth System", hasContent: hasGrowth },
    { id: "proof-authority", label: "Proof & Authority", hasContent: hasProof },
  ];

  const [activeId, setActiveId] = useState<string>("overview");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = scrollContainerRef.current ?? undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top that's intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = (visible[0].target as HTMLElement).dataset.section;
          if (id) setActiveId(id);
        }
      },
      {
        root,
        // Trigger when section enters the area just below the sticky bar
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      },
    );
    navSections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (id: string) => {
    const container = scrollContainerRef.current;
    const el = document.getElementById(id);
    if (!el || !container) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    const offset = 72; // sticky header height
    container.scrollTo({
      top: container.scrollTop + (elTop - containerTop) - offset,
      behavior: "smooth",
    });
    setActiveId(id);
  };

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto bg-background-dashboard print-root">
      {/* Sticky section navigation bar */}
      <div className="sticky top-0 z-10 backdrop-blur bg-card/90 border-b border-border no-print">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center gap-3">
          {/* Left: back + title */}
          <div className="flex items-center gap-2 shrink-0 mr-auto min-w-0">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5 h-8">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            )}
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-display font-bold text-foreground truncate">
              Business Blueprint
            </span>
            {isPublic && (
              <Badge variant="secondary" className="text-[10px] hidden lg:inline-flex">Read-only</Badge>
            )}
          </div>

          {/* Right: section dropdown + actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <span className="hidden sm:inline">{navSections.find((s) => s.id === activeId)?.label ?? "Sections"}</span>
                  <span className="sm:hidden">Sections</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 bg-popover">
                {navSections.filter((s) => s.hasContent).map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`text-sm ${activeId === s.id ? "text-primary font-semibold" : ""}`}
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 h-8 no-print"
              title="Download as PDF (use 'Save as PDF' in the print dialog)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Download PDF</span>
            </Button>
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5 h-8 no-print">
                <Share2 className="w-4 h-4" />
                <span className="hidden md:inline">Share</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-8 py-12 print-article">
        {/* Document title */}
        <header className="mb-12 pb-8 border-b border-border print-header">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3 print-eyebrow">
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
          <div className="mt-4 flex flex-wrap gap-2 print-badges">
            <Badge variant="secondary">{bt.label}</Badge>
            {workspace.main_goal && (
              <Badge variant="outline">Goal: {workspace.main_goal}</Badge>
            )}
          </div>
          <p className="hidden print-date text-xs text-muted-foreground mt-4">
            Generated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </header>

        {/* ============= BUSINESS OVERVIEW ============= */}
        <Section id="overview" title="Business Overview" icon={Sparkles} show={hasOverview}>
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
        <Section id="customer-clarity" title="Customer Clarity" icon={Users} show={hasClarity}>
          <SubBlock
            title="Ideal Client Avatar"
            show={hasText(clarity.avatar_who) || hasText(clarity.avatar_stage) || hasText(clarity.avatar_traits) || hasText(clarity.avatar_not_fit)}
          >
            <Field label="Who is your ideal client" value={clarity.avatar_who} />
            <Field label="Their current stage" value={clarity.avatar_stage} />
            <Field label="Defining traits" value={clarity.avatar_traits} />
            <Field label="Not a fit" value={clarity.avatar_not_fit} />
          </SubBlock>

          <SubBlock
            title="Pain & Friction"
            show={hasText(clarity.pain_main_problem) || hasText(clarity.pain_daily_frustrations) || hasText(clarity.pain_already_tried) || hasText(clarity.pain_consequences)}
          >
            <Field label="Main problem" value={clarity.pain_main_problem} />
            <Field label="Daily frustrations" value={clarity.pain_daily_frustrations} />
            <Field label="What they have already tried" value={clarity.pain_already_tried} />
            <Field label="Consequences of inaction" value={clarity.pain_consequences} />
          </SubBlock>

          <SubBlock
            title="Desire & Goals"
            show={hasText(clarity.desire_main_result) || hasText(clarity.desire_success_vision) || hasText(clarity.desire_why_badly)}
          >
            <Field label="Main result they want" value={clarity.desire_main_result} />
            <Field label="What success looks like" value={clarity.desire_success_vision} />
            <Field label="Why they want it badly" value={clarity.desire_why_badly} />
          </SubBlock>

          <SubBlock
            title="Transformation"
            show={hasText(clarity.transformation_point_a) || hasText(clarity.transformation_point_b) || hasText(clarity.transformation_process)}
          >
            <Field label="Where they are now (Point A)" value={clarity.transformation_point_a} />
            <Field label="Where they want to be (Point B)" value={clarity.transformation_point_b} />
            <Field label="The transformation process" value={clarity.transformation_process} />
          </SubBlock>
        </Section>

        {/* ============= OFFER DESIGN ============= */}
        <Section id="offer-design" title="Offer Design" icon={Package} show={hasOffer}>
          <SubBlock
            title="Offer Angle"
            show={Boolean(
              offer.angle?.main_offer_name || offer.angle?.core_outcome || promise ||
              offer.angle?.short_description || offer.angle?.angle_new_vehicle ||
              offer.angle?.angle_better_results || offer.angle?.angle_faster_outcome ||
              offer.angle?.angle_easier_process || offer.angle?.framework?.name,
            )}
          >
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

          <SubBlock
            title="Offer Stack"
            show={Boolean(
              (offer.stack?.deliverables?.length ?? 0) > 0 ||
              (offer.stack?.bonuses?.length ?? 0) > 0 ||
              (offer.stack?.milestones?.length ?? 0) > 0 ||
              offer.stack?.delivery_timeline,
            )}
          >
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

          <SubBlock
            title="Pricing"
            show={Boolean(
              corePrice ||
              (offer.pricing?.payment_plans?.length ?? 0) > 0 ||
              offer.pricing?.premium_enabled ||
              offer.pricing?.recurring_enabled ||
              (offer.pricing?.guarantee_type && offer.pricing.guarantee_type !== "none") ||
              hasText(offer.pricing?.guarantee_details),
            )}
          >
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

          <SubBlock title="Offer Ecosystem" show={Object.keys(ecosystemByTier).length > 0}>
            {["free", "low_ticket", "mid_ticket", "core", "premium", "continuity"]
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
              ))}
          </SubBlock>
        </Section>

        {/* ============= GROWTH SYSTEM ============= */}
        <Section id="growth-system" title="Growth System" icon={Workflow} show={hasGrowth}>
          <SubBlock
            title="Acquisition"
            show={Boolean(
              (growth.acquisition?.traffic_sources?.length ?? 0) > 0 ||
              growth.acquisition?.primary_entry_offer_id ||
              hasText(growth.acquisition?.lead_capture_method),
            )}
          >
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

          <SubBlock title="Funnel Architecture" show={mappings.length > 0}>
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
          </SubBlock>

          <SubBlock
            title="Ascension"
            show={Boolean(
              growth.ascension?.next_offer_after_core_id ||
              growth.ascension?.retention_offer_id ||
              growth.ascension?.referral_enabled ||
              growth.ascension?.reactivation_enabled ||
              hasText(growth.ascension?.referral_description) ||
              hasText(growth.ascension?.reactivation_description),
            )}
          >
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

        {/* ============= PROOF & AUTHORITY ============= */}
        <Section id="proof-authority" title="Proof & Authority" icon={Award} show={hasProof}>
          <>
              {/* Authority Positioning */}
              {(proof.authority.authority_types.length > 0 ||
                proof.authority.credibility_foundations.length > 0 ||
                proof.authority.trust_reason ||
                proof.authority.signature_proof) && (
                <SubBlock title="Authority Positioning">
                  {proof.authority.authority_types.length > 0 && (
                    <div className="rounded-lg border border-border bg-card px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Authority types
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {proof.authority.authority_types.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {proof.authority.credibility_foundations.length > 0 && (
                    <div className="rounded-lg border border-border bg-card px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Credibility foundations
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {proof.authority.credibility_foundations.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Field label="Trust reason" value={proof.authority.trust_reason} />
                  <Field label="Signature proof" value={proof.authority.signature_proof} />
                </SubBlock>
              )}

              {/* Social Proof Library */}
              {(proof.social_proof.metrics.length > 0 ||
                proof.social_proof.client_results.length > 0 ||
                proof.social_proof.testimonials.length > 0 ||
                proof.social_proof.authority_assets.length > 0) && (
                <SubBlock title="Social Proof Library">
                  {proof.social_proof.metrics.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Credibility metrics
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {proof.social_proof.metrics.map((m) => (
                          <div key={m.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            <p className="text-base font-semibold text-foreground">{m.value || "—"}</p>
                            <p className="text-sm text-muted-foreground">{m.metric}</p>
                            {m.context && <p className="text-xs text-muted-foreground/80 mt-1">{m.context}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proof.social_proof.client_results.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Client results
                      </p>
                      <div className="space-y-2">
                        {proof.social_proof.client_results.map((r) => (
                          <div key={r.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {r.client_type && <p className="text-sm font-semibold text-foreground">{r.client_type}</p>}
                              {r.proof_type && <Badge variant="outline" className="text-[10px]">{r.proof_type}</Badge>}
                            </div>
                            {r.problem && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground/80">Problem:</span> {r.problem}</p>}
                            {r.result_achieved && <p className="text-sm text-primary mt-1"><span className="font-medium">Result:</span> {r.result_achieved}{r.timeframe ? ` (${r.timeframe})` : ""}</p>}
                            {r.measurable_outcome && <p className="text-xs text-muted-foreground mt-1">{r.measurable_outcome}</p>}
                            {r.explanation && <p className="text-sm text-foreground/80 mt-1">{r.explanation}</p>}
                            {r.quote && <blockquote className="text-sm italic text-foreground/80 mt-2 border-l-2 border-primary/40 pl-3">"{r.quote}"</blockquote>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proof.social_proof.testimonials.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Testimonials
                      </p>
                      <div className="space-y-2">
                        {proof.social_proof.testimonials.map((t) => (
                          <div key={t.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            {t.quote && <blockquote className="text-sm italic text-foreground/90 border-l-2 border-primary/40 pl-3">"{t.quote}"</blockquote>}
                            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                              {t.client_name && <span className="font-medium text-foreground/80">— {t.client_name}</span>}
                              {t.client_type && <span>· {t.client_type}</span>}
                              {t.tone && <Badge variant="secondary" className="text-[10px]">{t.tone}</Badge>}
                            </div>
                            {t.main_outcome && <p className="text-xs text-primary mt-1">→ {t.main_outcome}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proof.social_proof.authority_assets.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Authority assets
                      </p>
                      <div className="space-y-2">
                        {proof.social_proof.authority_assets.map((a) => (
                          <div key={a.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            {a.name && <p className="text-sm font-semibold text-foreground">{a.name}</p>}
                            {a.description && <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>}
                            {a.why_it_matters && <p className="text-xs text-primary mt-1">{a.why_it_matters}</p>}
                            {a.external_link && (
                              <a href={a.external_link} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 inline-block break-all">
                                {a.external_link}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </SubBlock>
              )}

              {/* Objections & Beliefs */}
              {(proof.objections.objections.length > 0 ||
                proof.objections.failed_solutions.length > 0 ||
                proof.objections.faqs.length > 0) && (
                <SubBlock title="Objections & Beliefs">
                  {proof.objections.objections.length > 0 && (
                    <div className="space-y-2">
                      {proof.objections.objections.map((o) => (
                        <div key={o.id} className="rounded-lg border border-border bg-card px-4 py-3">
                          {o.objection && <p className="text-sm font-semibold text-foreground">"{o.objection}"</p>}
                          {o.why_believed && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Why believed:</span> {o.why_believed}</p>}
                          {o.reframe && <p className="text-sm text-primary mt-1"><span className="font-medium">Reframe:</span> {o.reframe}</p>}
                          {o.supporting_proof && <p className="text-xs text-foreground/80 mt-1"><span className="font-medium">Proof:</span> {o.supporting_proof}</p>}
                          {o.emotional_concern && <p className="text-xs text-muted-foreground mt-1 italic">{o.emotional_concern}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {proof.objections.failed_solutions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Failed previous solutions
                      </p>
                      <div className="space-y-2">
                        {proof.objections.failed_solutions.map((s) => (
                          <div key={s.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            {s.what_tried && <p className="text-sm font-semibold text-foreground">{s.what_tried}</p>}
                            {s.why_failed && <p className="text-xs text-muted-foreground mt-1">Why it failed: {s.why_failed}</p>}
                            {s.why_different && <p className="text-xs text-primary mt-1">Why we're different: {s.why_different}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proof.objections.faqs.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        FAQs
                      </p>
                      <div className="space-y-2">
                        {proof.objections.faqs.map((f) => (
                          <div key={f.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            {f.question && <p className="text-sm font-semibold text-foreground">Q: {f.question}</p>}
                            {f.answer && <p className="text-sm text-muted-foreground mt-1">A: {f.answer}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </SubBlock>
              )}

              {/* Stories & Educational Assets */}
              {(proof.authority.founder_stories.length > 0 ||
                proof.educational.lessons.length > 0 ||
                proof.educational.mistakes.length > 0 ||
                proof.educational.belief_shifts.length > 0) && (
                <SubBlock title="Stories & Educational Assets">
                  {proof.authority.founder_stories.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Founder stories
                      </p>
                      <div className="space-y-2">
                        {proof.authority.founder_stories.map((s) => (
                          <div key={s.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            {s.title && <p className="text-sm font-semibold text-foreground">{s.title}</p>}
                            {s.before && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground/80">Before:</span> {s.before}</p>}
                            {s.challenge && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground/80">Challenge:</span> {s.challenge}</p>}
                            {s.breakthrough && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground/80">Breakthrough:</span> {s.breakthrough}</p>}
                            {s.learned && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground/80">Learned:</span> {s.learned}</p>}
                            {s.after && <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground/80">After:</span> {s.after}</p>}
                            {s.core_lesson && <p className="text-sm text-primary mt-1">→ {s.core_lesson}</p>}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {s.emotional_theme && <Badge variant="secondary" className="text-[10px]">{s.emotional_theme}</Badge>}
                              {s.external_link && (
                                <a href={s.external_link} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                                  {s.external_link}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proof.educational.lessons.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Value lessons
                      </p>
                      <div className="space-y-2">
                        {proof.educational.lessons.map((l) => (
                          <div key={l.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            {l.title && <p className="text-sm font-semibold text-foreground">{l.title}</p>}
                            {l.main_topic && <p className="text-xs text-muted-foreground mt-0.5">{l.main_topic}</p>}
                            {l.common_challenge && <p className="text-sm text-foreground/80 mt-1"><span className="font-medium">Challenge:</span> {l.common_challenge}</p>}
                            {l.core_insight && <p className="text-sm text-primary mt-1"><span className="font-medium">Insight:</span> {l.core_insight}</p>}
                            {l.why_matters && <p className="text-xs text-muted-foreground mt-1">{l.why_matters}</p>}
                            {l.breakthrough_lesson && <p className="text-sm text-foreground/80 mt-1">→ {l.breakthrough_lesson}</p>}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {l.cta_goal && <Badge variant="secondary" className="text-[10px]">{l.cta_goal}</Badge>}
                              {l.external_link && (
                                <a href={l.external_link} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                                  {l.external_link}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proof.educational.mistakes.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Common mistakes
                      </p>
                      <div className="space-y-2">
                        {proof.educational.mistakes.map((m) => (
                          <div key={m.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            {m.mistake && <p className="text-sm font-semibold text-foreground">{m.mistake}</p>}
                            {m.why_made && <p className="text-xs text-muted-foreground mt-1">Why: {m.why_made}</p>}
                            {m.better_approach && <p className="text-xs text-primary mt-1">Better: {m.better_approach}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {proof.educational.belief_shifts.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Belief shifts
                      </p>
                      <div className="space-y-2">
                        {proof.educational.belief_shifts.map((b) => (
                          <div key={b.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            {b.old_belief && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground/80">Old:</span> {b.old_belief}</p>}
                            {b.new_belief && <p className="text-sm text-primary mt-1"><span className="font-medium">New:</span> {b.new_belief}</p>}
                            {b.why_matters && <p className="text-xs text-muted-foreground mt-1">{b.why_matters}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </SubBlock>
              )}
          </>
        </Section>

        <footer className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          Strategic Business Blueprint · Generated with Boostmate
        </footer>
      </article>
    </div>
  );
};

export default BlueprintViewMode;
