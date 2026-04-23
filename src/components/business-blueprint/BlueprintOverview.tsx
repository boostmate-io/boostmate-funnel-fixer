import { Users, Package, Workflow, Palette, Award, Sparkles, Pencil, Download, Wand2, ArrowRight, CheckCircle2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateClarityProgress, type SectionId, type CustomerClarityData } from "./types";
import { calculateOfferDesignProgress, buildPromisePreview, type OfferDesignData } from "./offerDesignTypes";
import { calculateGrowthSystemProgress, type GrowthSystemData } from "./growthSystemTypes";
import { getBusinessType } from "./businessTypes";

interface SectionSummary {
  id: SectionId;
  label: string;
  icon: typeof Users;
  description: string;
  progress: number;
  items: { label: string; value?: string }[];
}

interface Props {
  clarity: CustomerClarityData;
  offer: OfferDesignData;
  growth: GrowthSystemData;
  businessType: string;
  onEdit: (section?: SectionId) => void;
  onOpenSetup: () => void;
  setupCompleted: boolean;
}

const BlueprintOverview = ({ clarity, offer, growth, businessType, onEdit, onOpenSetup, setupCompleted }: Props) => {
  const bt = getBusinessType(businessType);
  const BtIcon = bt.icon;
  const clarityProgress = calculateClarityProgress(clarity);
  const offerProgress = calculateOfferDesignProgress(offer);
  const growthProgress = calculateGrowthSystemProgress(growth);

  const sections: SectionSummary[] = [
    {
      id: "customer-clarity",
      label: `${bt.customerNounSingular.charAt(0).toUpperCase() + bt.customerNounSingular.slice(1)} Clarity`,
      icon: Users,
      description: `Who you serve & what they truly want.`,
      progress: clarityProgress,
      items: [
        { label: "Target audience", value: clarity.avatar_who },
        { label: "Main pain", value: clarity.pain_main_problem },
        { label: "Desired outcome", value: clarity.desire_main_result },
        { label: "Transformation", value: clarity.transformation_point_b },
      ],
    },
    {
      id: "offer-design",
      label: "Offer Design",
      icon: Package,
      description: `Angle, stack, pricing & value ladder — tailored to a ${bt.label.toLowerCase()}.`,
      progress: offerProgress,
      items: [
        { label: "Main offer", value: offer.angle?.main_offer_name },
        { label: "Core promise", value: buildPromisePreview(offer.angle?.core_promise) },
        { label: "Core price", value: typeof offer.pricing?.core_price === "number" ? `$${offer.pricing.core_price}` : undefined },
        { label: "Deliverables", value: offer.stack?.deliverables?.length ? `${offer.stack.deliverables.length} defined` : undefined },
      ],
    },
    {
      id: "growth-system",
      label: "Growth System",
      icon: Workflow,
      description: "Traffic, funnels, conversion, nurture & ascension.",
      progress: growthProgress,
      items: [
        { label: "Primary traffic", value: growth.traffic_primary_source },
        { label: "Core offer funnel", value: growth.funnel_core_offer },
        { label: "Conversion mech.", value: growth.conversion_primary_mechanism },
        { label: "Monetization gap", value: growth.ascension_monetization_gap },
      ],
    },
    {
      id: "brand-strategy",
      label: "Brand Strategy",
      icon: Palette,
      description: "Positioning, voice & visual direction.",
      progress: 0,
      items: bt.brandExamples.slice(0, 3).map((label) => ({ label })),
    },
    {
      id: "proof-authority",
      label: "Proof & Authority",
      icon: Award,
      description: "Credibility stack & trust assets.",
      progress: 0,
      items: bt.proofExamples.slice(0, 3).map((label) => ({ label })),
    },
  ];

  const totalProgress = Math.round(
    sections.reduce((sum, s) => sum + s.progress, 0) / sections.length
  );
  const sectionsCompleted = sections.filter((s) => s.progress === 100).length;
  const missingHighImpact = sections
    .filter((s) => s.progress < 50)
    .slice(0, 3)
    .map((s) => s.label);

  return (
    <div className="h-full overflow-y-auto bg-background-dashboard">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-3xl font-display font-bold text-foreground">Business Blueprint</h1>
              {setupCompleted && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1.5 ml-1">
                      <BtIcon className="w-3 h-3 text-primary" />
                      <span className="text-[11px] font-medium">{bt.label} Mode</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Your blueprint is personalized for a {bt.label.toLowerCase()}. Change in Settings.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Strategic overview of your business, offers, {bt.customerNoun}, and growth systems.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-60 h-8">
                  <Wand2 className="w-4 h-4" />
                  AI Analyze
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI analysis coming soon</TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-60 h-8">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => onEdit()} className="gap-1.5 h-8">
              <Pencil className="w-4 h-4" />
              Edit Blueprint
            </Button>
          </div>
        </div>

        {/* Setup banner (only if user skipped or never ran) */}
        {!setupCompleted && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Personalize your Blueprint</p>
                <p className="text-xs text-muted-foreground">
                  Answer 5 quick questions so every example, AI suggestion and template fits your business.
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onOpenSetup} className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Start setup
            </Button>
          </div>
        )}

        {/* Top completion card */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
                  <circle
                    cx="40" cy="40" r="34"
                    stroke="currentColor" strokeWidth="6" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(totalProgress / 100) * 213.6} 213.6`}
                    className="text-primary transition-all"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-display font-bold text-foreground tabular-nums">{totalProgress}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Overall completion</p>
                <p className="text-xs text-muted-foreground">
                  {sectionsCompleted} of {sections.length} sections completed
                </p>
              </div>
            </div>
            {missingHighImpact.length > 0 && (
              <div className="flex-1 min-w-[260px] max-w-md">
                <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">High-impact gaps</p>
                <div className="flex flex-wrap gap-1.5">
                  {missingHighImpact.map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs">{label}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sections.map((s) => {
            const Icon = s.icon;
            const isComplete = s.progress === 100;
            return (
              <div
                key={s.id}
                className="bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-foreground">{s.label}</h3>
                        {isComplete && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums shrink-0">{s.progress}%</span>
                </div>

                <Progress value={s.progress} className="h-1 mb-4" />

                <div className="space-y-2 flex-1">
                  {s.items.map((item) => (
                    <div key={item.label} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0 min-w-[110px]">{item.label}:</span>
                      <span className={`flex-1 line-clamp-1 ${item.value ? "text-foreground" : "text-muted-foreground/60 italic"}`}>
                        {item.value?.trim() || "Not set yet"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between hover:bg-primary/5 hover:text-primary"
                    onClick={() => onEdit(s.id)}
                  >
                    Open Section
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BlueprintOverview;
