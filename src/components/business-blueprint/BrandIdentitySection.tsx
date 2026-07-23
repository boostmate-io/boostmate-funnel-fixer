// =============================================================================
// BrandIdentitySection — V3 Blueprint section.
// Three sub-blocks: Brand Positioning · Brand Voice · Visual Direction.
// Persists to business_blueprints.brand_strategy (jsonb).
// =============================================================================

import { Palette, Compass, Mic, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export interface BrandIdentityData {
  positioning_statement?: string;
  positioning_promise?: string;
  positioning_differentiators?: string;
  voice_tone?: string;
  voice_do?: string;
  voice_dont?: string;
  visual_style?: string;
  visual_colors?: string;
  visual_references?: string;
}

const FIELDS: (keyof BrandIdentityData)[] = [
  "positioning_statement",
  "positioning_promise",
  "positioning_differentiators",
  "voice_tone",
  "voice_do",
  "voice_dont",
  "visual_style",
  "visual_colors",
  "visual_references",
];

export function calcBrandIdentityProgress(d?: BrandIdentityData | null): number {
  if (!d) return 0;
  const filled = FIELDS.filter((k) => (d[k] || "").toString().trim().length > 0).length;
  return Math.round((filled / FIELDS.length) * 100);
}

interface Props {
  data: BrandIdentityData;
  onChange: (patch: Partial<BrandIdentityData>) => void;
  saving?: boolean;
}

const Card = ({ icon: Icon, title, description, children }: { icon: any; title: string; description: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="flex items-start gap-3 px-5 py-4 border-b border-border">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h3 className="text-lg font-display font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div>
    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground/70 mt-1">{hint}</p>}
  </div>
);

const BrandIdentitySection = ({ data, onChange }: Props) => {
  const progress = calcBrandIdentityProgress(data);
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-display font-bold text-foreground">Brand Identity</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Make your brand unmistakable — how it stands, how it sounds, and how it looks.
            </p>
          </div>
          <div className="min-w-[180px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Section progress</span>
              <span className="text-[11px] font-semibold tabular-nums text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        <Card icon={Compass} title="Brand Positioning" description="The one-line strategic claim your business owns in the market.">
          <Field label="Positioning statement" hint="For {audience}, we are the {category} that {differentiator}, so they can {outcome}.">
            <AutoTextarea
              value={data.positioning_statement ?? ""}
              onChange={(e) => onChange({ positioning_statement: e.target.value })}
              placeholder="For B2B coaches, we are the growth OS that operationalizes the whole business — so they can scale without burnout."
              rows={3}
              className="text-sm resize-none"
            />
          </Field>
          <Field label="Core promise">
            <AutoTextarea
              value={data.positioning_promise ?? ""}
              onChange={(e) => onChange({ positioning_promise: e.target.value })}
              placeholder="The transformation you consistently deliver, in one sentence."
              rows={2}
              className="text-sm resize-none"
            />
          </Field>
          <Field label="Key differentiators" hint="Comma-separated or a few short lines.">
            <AutoTextarea
              value={data.positioning_differentiators ?? ""}
              onChange={(e) => onChange({ positioning_differentiators: e.target.value })}
              placeholder="Built by operators · Roadmap-driven · Coach-in-the-loop"
              rows={2}
              className="text-sm resize-none"
            />
          </Field>
        </Card>

        <Card icon={Mic} title="Brand Voice" description="How your brand sounds when it writes, teaches and sells.">
          <Field label="Tone">
            <Input
              value={data.voice_tone ?? ""}
              onChange={(e) => onChange({ voice_tone: e.target.value })}
              placeholder="Direct · warm · expert · no fluff"
              className="h-9 text-sm"
            />
          </Field>
          <Field label="We DO">
            <AutoTextarea
              value={data.voice_do ?? ""}
              onChange={(e) => onChange({ voice_do: e.target.value })}
              placeholder="Speak plainly. Show numbers. Address objections head-on."
              rows={3}
              className="text-sm resize-none"
            />
          </Field>
          <Field label="We DON'T">
            <AutoTextarea
              value={data.voice_dont ?? ""}
              onChange={(e) => onChange({ voice_dont: e.target.value })}
              placeholder="Hype. Empty jargon. Fake scarcity."
              rows={3}
              className="text-sm resize-none"
            />
          </Field>
        </Card>

        <Card icon={Eye} title="Visual Direction" description="How your brand looks — style, color, references.">
          <Field label="Visual style">
            <AutoTextarea
              value={data.visual_style ?? ""}
              onChange={(e) => onChange({ visual_style: e.target.value })}
              placeholder="Clean · modern · confident. Generous whitespace. Bold display type."
              rows={2}
              className="text-sm resize-none"
            />
          </Field>
          <Field label="Colors" hint="Primary + accents. Hex values or plain names.">
            <Input
              value={data.visual_colors ?? ""}
              onChange={(e) => onChange({ visual_colors: e.target.value })}
              placeholder="#6246ff · off-white · charcoal"
              className="h-9 text-sm"
            />
          </Field>
          <Field label="Visual references / inspiration" hint="Links, brand names, or short descriptions.">
            <AutoTextarea
              value={data.visual_references ?? ""}
              onChange={(e) => onChange({ visual_references: e.target.value })}
              placeholder="Linear · Attio · Framer. Product-first, no stock photography."
              rows={2}
              className="text-sm resize-none"
            />
          </Field>
        </Card>
      </div>
    </div>
  );
};

export default BrandIdentitySection;
