import { useState } from "react";
import { User, AlertTriangle, Target, ArrowRightLeft, Sparkles, Lightbulb, Wand2, MessageSquare, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateSubBlockProgress, type ClaritySubBlock, type CustomerClarityData } from "./types";

interface Props {
  data: CustomerClarityData;
  onChange: (patch: Partial<CustomerClarityData>) => void;
  saving: boolean;
}

const subBlocks: { id: ClaritySubBlock; label: string; icon: typeof User; description: string }[] = [
  { id: "avatar", label: "Ideal Customer Avatar", icon: User, description: "Define who your ideal customer is in a practical marketing sense." },
  { id: "pain", label: "Pain & Friction", icon: AlertTriangle, description: "Capture what your customer is struggling with right now." },
  { id: "desire", label: "Desire & Goals", icon: Target, description: "Map what they want, externally and internally." },
  { id: "transformation", label: "Transformation", icon: ArrowRightLeft, description: "Define the journey from current state to desired state." },
];

const FieldGroup = ({
  label,
  helper,
  children,
}: { label: string; helper?: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold text-foreground">{label}</Label>
    {children}
    {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
  </div>
);

const AIPlaceholders = () => (
  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
    {[
      { icon: Wand2, label: "Generate draft" },
      { icon: Sparkles, label: "Improve" },
      { icon: MessageSquare, label: "Coach me" },
      { icon: Lightbulb, label: "Examples" },
    ].map(({ icon: Icon, label }) => (
      <Tooltip key={label}>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs h-7 opacity-60">
            <Icon className="w-3 h-3" />
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>AI assistance coming soon</TooltipContent>
      </Tooltip>
    ))}
  </div>
);

const CustomerClaritySection = ({ data, onChange, saving }: Props) => {
  const [active, setActive] = useState<ClaritySubBlock>("avatar");
  const activeBlock = subBlocks.find((b) => b.id === active)!;

  const renderActive = () => {
    switch (active) {
      case "avatar":
        return (
          <div className="space-y-5">
            <FieldGroup label="Who is your ideal customer?" helper="Be specific — name, role, situation.">
              <Textarea value={data.avatar_who || ""} onChange={(e) => onChange({ avatar_who: e.target.value })} placeholder="e.g. Solo coaches doing 5K-15K/month..." className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What type of person or business are they?">
              <Textarea value={data.avatar_type || ""} onChange={(e) => onChange({ avatar_type: e.target.value })} className="min-h-[70px]" />
            </FieldGroup>
            <FieldGroup label="What stage are they at right now?">
              <Select value={data.avatar_stage || ""} onValueChange={(v) => onChange({ avatar_stage: v })}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner — just starting</SelectItem>
                  <SelectItem value="growing">Growing — gaining traction</SelectItem>
                  <SelectItem value="established">Established — needs scaling</SelectItem>
                  <SelectItem value="advanced">Advanced — optimizing</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label="What niche / market are they in?">
              <Textarea value={data.avatar_niche || ""} onChange={(e) => onChange({ avatar_niche: e.target.value })} className="min-h-[70px]" />
            </FieldGroup>
            <FieldGroup label="What traits or mindset define them?">
              <Textarea value={data.avatar_traits || ""} onChange={(e) => onChange({ avatar_traits: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="Who is NOT a good fit?" helper="Knowing who to exclude sharpens your messaging.">
              <Textarea value={data.avatar_not_fit || ""} onChange={(e) => onChange({ avatar_not_fit: e.target.value })} className="min-h-[70px]" />
            </FieldGroup>
            <AIPlaceholders />
          </div>
        );
      case "pain":
        return (
          <div className="space-y-5">
            <FieldGroup label="What is the main problem they are dealing with?">
              <Textarea value={data.pain_main_problem || ""} onChange={(e) => onChange({ pain_main_problem: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What frustrations do they experience daily?">
              <Textarea value={data.pain_daily_frustrations || ""} onChange={(e) => onChange({ pain_daily_frustrations: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What is stopping them from getting results?">
              <Textarea value={data.pain_blockers || ""} onChange={(e) => onChange({ pain_blockers: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What have they already tried?">
              <Textarea value={data.pain_already_tried || ""} onChange={(e) => onChange({ pain_already_tried: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="Why didn't previous attempts work?">
              <Textarea value={data.pain_why_failed || ""} onChange={(e) => onChange({ pain_why_failed: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What are the consequences if they do nothing?" helper="Both practical and emotional consequences.">
              <Textarea value={data.pain_consequences || ""} onChange={(e) => onChange({ pain_consequences: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <AIPlaceholders />
          </div>
        );
      case "desire":
        return (
          <div className="space-y-5">
            <FieldGroup label="What result do they want most?">
              <Textarea value={data.desire_main_result || ""} onChange={(e) => onChange({ desire_main_result: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What does their dream scenario look like?">
              <Textarea value={data.desire_dream_scenario || ""} onChange={(e) => onChange({ desire_dream_scenario: e.target.value })} className="min-h-[100px]" />
            </FieldGroup>
            <FieldGroup label="What emotional change do they want?">
              <Textarea value={data.desire_emotional_change || ""} onChange={(e) => onChange({ desire_emotional_change: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What kind of freedom, identity, status, or lifestyle do they want?">
              <Textarea value={data.desire_lifestyle || ""} onChange={(e) => onChange({ desire_lifestyle: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="Why do they want this so badly?" helper="Dig deeper than surface-level goals.">
              <Textarea value={data.desire_why_badly || ""} onChange={(e) => onChange({ desire_why_badly: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <AIPlaceholders />
          </div>
        );
      case "transformation":
        return (
          <div className="space-y-5">
            <FieldGroup label="What does Point A look like?" helper="Their current state — pain, situation, identity.">
              <Textarea value={data.transformation_point_a || ""} onChange={(e) => onChange({ transformation_point_a: e.target.value })} className="min-h-[100px]" />
            </FieldGroup>
            <FieldGroup label="What does Point B look like?" helper="Their desired state — outcome, situation, new identity.">
              <Textarea value={data.transformation_point_b || ""} onChange={(e) => onChange({ transformation_point_b: e.target.value })} className="min-h-[100px]" />
            </FieldGroup>
            <FieldGroup label="What changes externally?">
              <Textarea value={data.transformation_external || ""} onChange={(e) => onChange({ transformation_external: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What changes internally?">
              <Textarea value={data.transformation_internal || ""} onChange={(e) => onChange({ transformation_internal: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <FieldGroup label="What becomes possible once they reach the result?">
              <Textarea value={data.transformation_possible || ""} onChange={(e) => onChange({ transformation_possible: e.target.value })} className="min-h-[80px]" />
            </FieldGroup>
            <AIPlaceholders />
          </div>
        );
    }
  };

  return (
    <div className="flex h-full">
      {/* Sub navigation */}
      <div className="w-72 border-r border-border bg-card/40 p-4 space-y-1 shrink-0 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">Sub-blocks</p>
        {subBlocks.map((sb) => {
          const progress = calculateSubBlockProgress(data, sb.id);
          const isActive = active === sb.id;
          const Icon = sb.icon;
          return (
            <button
              key={sb.id}
              onClick={() => setActive(sb.id)}
              className={`w-full text-left rounded-lg p-3 transition-all border ${
                isActive
                  ? "bg-primary/10 border-primary/30 shadow-sm"
                  : "border-transparent hover:bg-muted/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                      {sb.label}
                    </span>
                    {progress === 100 && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                  <Progress value={progress} className="h-1 mt-2" />
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug line-clamp-2">{sb.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active sub-block */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <activeBlock.icon className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-display font-bold text-foreground">{activeBlock.label}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{activeBlock.description}</p>
            </div>
            {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
          </div>
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            {renderActive()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerClaritySection;
