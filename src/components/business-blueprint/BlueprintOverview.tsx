import { Users, Package, Workflow, Palette, Award, Sparkles, Pencil, Download, Wand2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateClarityProgress, type SectionId, type CustomerClarityData } from "./types";

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
  onEdit: (section?: SectionId) => void;
}

const BlueprintOverview = ({ clarity, onEdit }: Props) => {
  const clarityProgress = calculateClarityProgress(clarity);

  const sections: SectionSummary[] = [
    {
      id: "customer-clarity",
      label: "Customer Clarity",
      icon: Users,
      description: "Who you serve & what they truly want.",
      progress: clarityProgress,
      items: [
        { label: "Target audience", value: clarity.avatar_who },
        { label: "Main pain", value: clarity.pain_main_problem },
        { label: "Desired outcome", value: clarity.desire_main_result },
        { label: "Transformation", value: clarity.transformation_point_b },
      ],
    },
    {
      id: "offer-stack",
      label: "Offer Stack",
      icon: Package,
      description: "Your full value ladder, end-to-end.",
      progress: 0,
      items: [
        { label: "Core offer" },
        { label: "Free / lead magnet" },
        { label: "Low-ticket entry" },
        { label: "Premium offer" },
      ],
    },
    {
      id: "growth-system",
      label: "Growth System",
      icon: Workflow,
      description: "Traffic → funnels → conversion.",
      progress: 0,
      items: [
        { label: "Main traffic source" },
        { label: "Funnel setup" },
        { label: "Conversion mechanism" },
      ],
    },
    {
      id: "brand-strategy",
      label: "Brand Strategy",
      icon: Palette,
      description: "Positioning, voice & visual direction.",
      progress: 0,
      items: [
        { label: "Positioning" },
        { label: "Voice" },
        { label: "Style direction" },
      ],
    },
    {
      id: "proof-authority",
      label: "Proof & Authority",
      icon: Award,
      description: "Credibility stack & trust assets.",
      progress: 0,
      items: [
        { label: "Testimonials" },
        { label: "Proof assets" },
        { label: "Credibility metrics" },
      ],
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
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-3xl font-display font-bold text-foreground">Business Blueprint</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Strategic overview of your business, offers, customers, and growth systems.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-60">
                  <Wand2 className="w-4 h-4" />
                  AI Analyze
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI analysis coming soon</TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-60">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => onEdit()} className="gap-1.5">
              <Pencil className="w-4 h-4" />
              Edit Blueprint
            </Button>
          </div>
        </div>

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
