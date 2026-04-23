// =============================================================================
// OfferStackTab — Tab 2
// Modular builders for Deliverables, Templates, Support, Bonuses, Timeline,
// Milestones. No giant text fields.
// =============================================================================

import { Layers, Trash2, Package, Library, MessageCircle, Gift, Clock, Map } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SectionShell from "./SectionShell";
import BuilderCard from "./BuilderCard";
import MultiSelectChips from "./MultiSelectChips";
import TimeframePicker from "./TimeframePicker";
import {
  type OfferStackData,
  type DeliverableCard,
  type BonusCard,
  type MilestoneCard,
  type DeliveryFrequency,
  FREQUENCY_OPTIONS,
  TEMPLATE_RESOURCE_LIBRARY,
  SUPPORT_CHANNEL_LIBRARY,
  calcStackProgress,
} from "../offerDesignTypes";
import { getBusinessType } from "../businessTypes";

const newId = () => crypto.randomUUID();

interface Props {
  data: OfferStackData;
  onChange: (patch: Partial<OfferStackData>) => void;
  saving: boolean;
  businessType?: string;
}

const OfferStackTab = ({ data, onChange, saving, businessType }: Props) => {
  const bt = getBusinessType(businessType);
  const noun = bt.customerNoun;
  const progress = calcStackProgress(data);

  // ----- Deliverables -----
  const addDeliverable = () =>
    onChange({
      deliverables: [
        ...data.deliverables,
        { id: newId(), name: "", description: "", delivery_method: "", frequency: "weekly" },
      ],
    });
  const updateDeliverable = (id: string, patch: Partial<DeliverableCard>) =>
    onChange({ deliverables: data.deliverables.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  const removeDeliverable = (id: string) =>
    onChange({ deliverables: data.deliverables.filter((d) => d.id !== id) });

  // ----- Bonuses -----
  const addBonus = () =>
    onChange({
      bonuses: [...data.bonuses, { id: newId(), name: "", description: "", perceived_value: "" }],
    });
  const updateBonus = (id: string, patch: Partial<BonusCard>) =>
    onChange({ bonuses: data.bonuses.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const removeBonus = (id: string) =>
    onChange({ bonuses: data.bonuses.filter((b) => b.id !== id) });

  // ----- Milestones -----
  const addMilestone = () =>
    onChange({
      milestones: [
        ...data.milestones,
        { id: newId(), phase_name: `Phase ${data.milestones.length + 1}`, description: "", expected_outcome: "" },
      ],
    });
  const updateMilestone = (id: string, patch: Partial<MilestoneCard>) =>
    onChange({ milestones: data.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const removeMilestone = (id: string) =>
    onChange({ milestones: data.milestones.filter((m) => m.id !== id) });

  const feedback =
    progress >= 100
      ? "Premium-level stack. The price will feel like a no-brainer."
      : progress >= 80
      ? "Strong stack. Perceived value is clearly stacking up."
      : progress >= 50
      ? "Solid foundation. Keep adding clarity to each component."
      : null;

  return (
    <SectionShell
      icon={Layers}
      title="Offer Stack"
      description="Define exactly what people receive when they buy."
      insight={`A clear stack removes confusion. ${noun.charAt(0).toUpperCase() + noun.slice(1)} need to instantly see what's included and why it's worth more than the price.`}
      progress={progress}
      saving={saving}
      feedback={feedback}
      rightBadge={
        <Badge variant="outline" className="gap-1.5 text-xs">
          <bt.icon className="w-3 h-3 text-primary" />
          {bt.label} mode
        </Badge>
      }
    >
      <div className="space-y-5">
        {/* Core Deliverables */}
        <BuilderCard
          icon={Package}
          title="Core Deliverables"
          description="Main service, coaching or program components."
          addLabel="Add Deliverable"
          onAdd={addDeliverable}
          count={data.deliverables.length}
          emptyText="No deliverables yet. Start with your most valuable component."
        >
          {data.deliverables.length > 0 && (
            <div className="space-y-3">
              {data.deliverables.map((d) => (
                <div key={d.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Input
                      value={d.name}
                      onChange={(e) => updateDeliverable(d.id, { name: e.target.value })}
                      placeholder="Deliverable name (e.g. Weekly 1:1 Coaching Calls)"
                      className="h-9 font-medium"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeDeliverable(d.id)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={d.description ?? ""}
                    onChange={(e) => updateDeliverable(d.id, { description: e.target.value })}
                    placeholder="Short description…"
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={d.delivery_method ?? ""}
                      onChange={(e) => updateDeliverable(d.id, { delivery_method: e.target.value })}
                      placeholder="Delivery method (e.g. Zoom, Slack)"
                      className="h-9 text-sm"
                    />
                    <Select
                      value={d.frequency ?? "weekly"}
                      onValueChange={(v) => updateDeliverable(d.id, { frequency: v as DeliveryFrequency })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BuilderCard>

        {/* Templates & Resources */}
        <BuilderCard
          icon={Library}
          title="Templates & Resources"
          description="Pick the resources included in your offer. Add custom ones too."
          addLabel="Add Custom"
          onAdd={() => { /* handled inside MultiSelectChips */ }}
          count={data.templates_resources.length}
        >
          <MultiSelectChips
            options={TEMPLATE_RESOURCE_LIBRARY}
            value={data.templates_resources}
            onChange={(v) => onChange({ templates_resources: v })}
            customPlaceholder="Add custom resource type…"
          />
        </BuilderCard>

        {/* Support System */}
        <BuilderCard
          icon={MessageCircle}
          title="Support System"
          description="How will clients reach you and your team?"
          addLabel="Add Custom"
          onAdd={() => { /* handled inside MultiSelectChips */ }}
          count={data.support_system.length}
        >
          <MultiSelectChips
            options={SUPPORT_CHANNEL_LIBRARY}
            value={data.support_system}
            onChange={(v) => onChange({ support_system: v })}
            customPlaceholder="Add custom channel…"
          />
        </BuilderCard>

        {/* Bonuses */}
        <BuilderCard
          icon={Gift}
          title="Bonuses"
          description="Additional incentives that tip the decision in your favor."
          addLabel="Add Bonus"
          onAdd={addBonus}
          count={data.bonuses.length}
          emptyText="No bonuses yet. Add 1–3 high-value bonuses to anchor perceived value."
        >
          {data.bonuses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.bonuses.map((b) => (
                <div key={b.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Input
                      value={b.name}
                      onChange={(e) => updateBonus(b.id, { name: e.target.value })}
                      placeholder="Bonus name"
                      className="h-9 font-medium"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeBonus(b.id)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={b.description ?? ""}
                    onChange={(e) => updateBonus(b.id, { description: e.target.value })}
                    placeholder="Short description…"
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <Input
                    value={b.perceived_value ?? ""}
                    onChange={(e) => updateBonus(b.id, { perceived_value: e.target.value })}
                    placeholder="Perceived value (e.g. €497 value)"
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </BuilderCard>

        {/* Delivery Timeline */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground">Delivery Timeline</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Over what timeframe is the value delivered?
              </p>
            </div>
          </div>
          <div className="max-w-xs">
            <TimeframePicker
              value={data.delivery_timeline}
              customValue={data.delivery_timeline_custom}
              onChange={(timeframe, custom) =>
                onChange({ delivery_timeline: timeframe, delivery_timeline_custom: custom })
              }
            />
          </div>
        </div>

        {/* Milestones */}
        <BuilderCard
          icon={Map}
          title="Milestones / Roadmap"
          description="The step-by-step journey through your offer."
          addLabel="Add Milestone"
          onAdd={addMilestone}
          count={data.milestones.length}
          emptyText="Map out the phases your clients move through. Most great programs have 3–5."
        >
          {data.milestones.length > 0 && (
            <div className="space-y-3">
              {data.milestones.map((m, idx) => (
                <div key={m.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <Input
                          value={m.phase_name}
                          onChange={(e) => updateMilestone(m.id, { phase_name: e.target.value })}
                          placeholder="Phase name (e.g. Awareness)"
                          className="h-9 font-medium"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMilestone(m.id)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Textarea
                          value={m.description ?? ""}
                          onChange={(e) => updateMilestone(m.id, { description: e.target.value })}
                          placeholder="Description"
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <Textarea
                          value={m.expected_outcome ?? ""}
                          onChange={(e) => updateMilestone(m.id, { expected_outcome: e.target.value })}
                          placeholder="Expected outcome"
                          rows={2}
                          className="resize-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BuilderCard>
      </div>
    </SectionShell>
  );
};

export default OfferStackTab;
