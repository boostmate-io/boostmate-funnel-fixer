// =============================================================================
// OfferStackTab — Tab 2 (redesigned)
// Cards everywhere. Quick-add chips create editable cards. Delivery type uses
// the shared DELIVERY_LIBRARY picker.
// =============================================================================

import { Layers, Trash2, Package, Library, MessageCircle, Gift, Clock, Map, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SectionShell from "./SectionShell";
import BuilderCard from "./BuilderCard";
import TimeframePicker from "./TimeframePicker";
import DeliveryTypePicker from "./DeliveryTypePicker";
import {
  type OfferStackData,
  type DeliverableCard,
  type BonusCard,
  type MilestoneCard,
  type DeliveryFrequency,
  type ResourceCard,
  type SupportChannelCard,
  FREQUENCY_OPTIONS,
  RESOURCE_QUICK_PICKS,
  SUPPORT_QUICK_PICKS,
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
        { id: newId(), name: "", description: "", delivery_types: [], frequency: "weekly" },
      ],
    });
  const updateDeliverable = (id: string, patch: Partial<DeliverableCard>) =>
    onChange({ deliverables: data.deliverables.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  const removeDeliverable = (id: string) =>
    onChange({ deliverables: data.deliverables.filter((d) => d.id !== id) });

  // ----- Resources -----
  const addResource = (preset?: string) =>
    onChange({
      resources: [
        ...data.resources,
        { id: newId(), name: preset ?? "", resource_type: preset ?? "", description: "" },
      ],
    });
  const updateResource = (id: string, patch: Partial<ResourceCard>) =>
    onChange({ resources: data.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const removeResource = (id: string) =>
    onChange({ resources: data.resources.filter((r) => r.id !== id) });

  // ----- Support Channels -----
  const addSupport = (preset?: string) =>
    onChange({
      support_channels: [
        ...data.support_channels,
        { id: newId(), name: preset ?? "", description: "", frequency: "" },
      ],
    });
  const updateSupport = (id: string, patch: Partial<SupportChannelCard>) =>
    onChange({ support_channels: data.support_channels.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeSupport = (id: string) =>
    onChange({ support_channels: data.support_channels.filter((s) => s.id !== id) });

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

  // ----- Quick-add chip strip -----
  const QuickAddChips = ({
    options,
    onPick,
  }: {
    options: string[];
    onPick: (v: string) => void;
  }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onPick(opt)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Plus className="w-3 h-3" />
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <SectionShell
      icon={Layers}
      title="Offer Stack"
      description="Define exactly what people receive when they buy."
      insight={`A clear stack removes confusion. ${noun.charAt(0).toUpperCase() + noun.slice(1)} need to instantly see what's included and why it's worth more than the price.`}
      progress={progress}
      saving={saving}
      feedback={feedback}
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
                  <AutoTextarea
                    value={d.description ?? ""}
                    onChange={(e) => updateDeliverable(d.id, { description: e.target.value })}
                    placeholder="Short description…"
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                        Delivery Type
                      </Label>
                      <DeliveryTypePicker
                        value={d.delivery_types ?? []}
                        onChange={(v) => updateDeliverable(d.id, { delivery_types: v })}
                        placeholder="Pick how it's delivered…"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                        Frequency
                      </Label>
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
                </div>
              ))}
            </div>
          )}
        </BuilderCard>

        {/* Templates & Resources */}
        <BuilderCard
          icon={Library}
          title="Templates & Resources"
          description="Add resources included in your offer. Click a quick-add chip to start a card."
          addLabel="Add Resource"
          onAdd={() => addResource()}
          count={data.resources.length}
          emptyText="No resources yet. Quick-add common types below or add a custom resource."
          emptyAction={
            <div className="space-y-3">
              <QuickAddChips options={RESOURCE_QUICK_PICKS.slice(0, 10)} onPick={(v) => addResource(v)} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addResource()}
                className="gap-1.5 text-primary hover:bg-primary/5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Resource
              </Button>
            </div>
          }
        >
          {data.resources.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.resources.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Input
                        value={r.name}
                        onChange={(e) => updateResource(r.id, { name: e.target.value })}
                        placeholder="Resource name"
                        className="h-9 font-medium"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeResource(r.id)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      value={r.resource_type ?? ""}
                      onChange={(e) => updateResource(r.id, { resource_type: e.target.value })}
                      placeholder="Type (Template, Ebook, Checklist…)"
                      className="h-8 text-sm"
                    />
                    <AutoTextarea
                      value={r.description ?? ""}
                      onChange={(e) => updateResource(r.id, { description: e.target.value })}
                      placeholder="Short description…"
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Quick-add</p>
                <QuickAddChips options={RESOURCE_QUICK_PICKS} onPick={(v) => addResource(v)} />
              </div>
            </div>
          )}
        </BuilderCard>

        {/* Support System */}
        <BuilderCard
          icon={MessageCircle}
          title="Support System"
          description="How will clients reach you and your team?"
          addLabel="Add Support Channel"
          onAdd={() => addSupport()}
          count={data.support_channels.length}
          emptyText="No support channels yet. Quick-add common ones or add custom."
          emptyAction={
            <div className="space-y-3">
              <QuickAddChips options={SUPPORT_QUICK_PICKS.slice(0, 8)} onPick={(v) => addSupport(v)} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addSupport()}
                className="gap-1.5 text-primary hover:bg-primary/5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Channel
              </Button>
            </div>
          }
        >
          {data.support_channels.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.support_channels.map((s) => (
                  <div key={s.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Input
                        value={s.name}
                        onChange={(e) => updateSupport(s.id, { name: e.target.value })}
                        placeholder="Channel name (e.g. Slack)"
                        className="h-9 font-medium"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSupport(s.id)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      value={s.frequency ?? ""}
                      onChange={(e) => updateSupport(s.id, { frequency: e.target.value })}
                      placeholder="Frequency / availability (e.g. Mon–Fri 9–5 CET)"
                      className="h-8 text-sm"
                    />
                    <AutoTextarea
                      value={s.description ?? ""}
                      onChange={(e) => updateSupport(s.id, { description: e.target.value })}
                      placeholder="Short description…"
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Quick-add</p>
                <QuickAddChips options={SUPPORT_QUICK_PICKS} onPick={(v) => addSupport(v)} />
              </div>
            </div>
          )}
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
                  <AutoTextarea
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
              <Label className="text-lg font-display font-bold text-foreground">Delivery Timeline</Label>
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
                        <AutoTextarea
                          value={m.description ?? ""}
                          onChange={(e) => updateMilestone(m.id, { description: e.target.value })}
                          placeholder="Description"
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <AutoTextarea
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
