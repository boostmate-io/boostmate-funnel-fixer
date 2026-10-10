// =============================================================================
// OfferStackTab — Tab 2 (redesigned)
// Every editable field has an AI Coach entry point, placed top-right of the
// field's label row (or inline next to an unlabelled input).
// =============================================================================

import { Layers, Trash2, Package, Library, MessageCircle, Gift, Clock, Map, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SectionShell from "./SectionShell";
import SectionHelpCoach from "../SectionHelpCoach";
import BuilderCard from "./BuilderCard";
import CollapsibleItem from "./CollapsibleItem";
import TimeframePicker from "./TimeframePicker";
import DeliveryTypePicker from "./DeliveryTypePicker";
import CoachIconButton from "./CoachIconButton";
import { useOfferCoach } from "./useOfferCoach";
import { useLatestRef } from "@/lib/coach/useLatestRef";
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
import { offerEditorField, offerEditorList } from "../registryUi";

// Offer Stack copy, list-Coach targets and item Coach targets come from the
// central registry; add/remove, ordering and controls stay in this component.
export const STACK_LISTS = {
  deliverables: offerEditorList("offer_stack.stack.deliverables"),
  resources: offerEditorList("offer_stack.stack.resources"),
  support_channels: offerEditorList("offer_stack.stack.support_channels"),
  bonuses: offerEditorList("offer_stack.stack.bonuses"),
  milestones: offerEditorList("offer_stack.stack.milestones"),
};
const TIMELINE = offerEditorField("offer_stack.stack.delivery_timeline");

const newId = () => crypto.randomUUID();

interface Props {
  data: OfferStackData;
  onChange: (patch: Partial<OfferStackData>) => void;
  saving: boolean;
  businessType?: string;
  embedded?: boolean;
  /** Render only these blocks (category editors). Default: all. */
  only?: StackBlock[];
  /** Render without the section header (embedded inside another layout). */
  bare?: boolean;
}

export type StackBlock = "deliverables" | "resources" | "support_channels" | "bonuses" | "timeline" | "milestones";

/** Small helper: label row with a compact Coach icon on the right. */
const LabelRow = ({
  label,
  onCoach,
}: {
  label: React.ReactNode;
  onCoach?: () => void;
}) => (
  <div className="flex items-center justify-between mb-1.5">
    <Label className="text-xs font-medium text-muted-foreground block">{label}</Label>
    {onCoach && <CoachIconButton compact onClick={onCoach} />}
  </div>
);

const OfferStackTab = ({ data, onChange, saving, businessType, embedded, only, bare }: Props) => {
  const show = (b: StackBlock) => !only || only.includes(b);
  const bt = getBusinessType(businessType);
  const noun = bt.customerNoun;
  const progress = calcStackProgress(data);
  const { openCoach, openListCoach, panel } = useOfferCoach(() => ({ offer_stack: { stack: data } }));

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

  // ----- Section-Coach appenders (list_section mode) -----
  // Refs so batch appends always operate on the LATEST data, not the
  // snapshot captured when the Coach button was clicked.
  const dataRef = useLatestRef(data);
  const onChangeRef = useLatestRef(onChange);
  const appendDeliverable = (item: Record<string, string>) =>
    onChangeRef.current({
      deliverables: [
        ...dataRef.current.deliverables,
        {
          id: newId(),
          name: (item.name ?? "").trim(),
          description: (item.description ?? "").trim(),
          delivery_types: [],
          frequency: "weekly",
        },
      ],
    });
  const appendResource = (item: Record<string, string>) =>
    onChangeRef.current({
      resources: [
        ...dataRef.current.resources,
        {
          id: newId(),
          name: (item.name ?? "").trim(),
          resource_type: (item.resource_type ?? "").trim(),
          description: (item.description ?? "").trim(),
        },
      ],
    });
  const appendSupport = (item: Record<string, string>) =>
    onChangeRef.current({
      support_channels: [
        ...dataRef.current.support_channels,
        {
          id: newId(),
          name: (item.name ?? "").trim(),
          description: (item.description ?? "").trim(),
          frequency: (item.frequency ?? "").trim(),
        },
      ],
    });
  const appendBonus = (item: Record<string, string>) =>
    onChangeRef.current({
      bonuses: [
        ...dataRef.current.bonuses,
        {
          id: newId(),
          name: (item.name ?? "").trim(),
          description: (item.description ?? "").trim(),
          perceived_value: (item.perceived_value ?? "").trim(),
        },
      ],
    });
  const appendMilestone = (item: Record<string, string>) =>
    onChangeRef.current({
      milestones: [
        ...dataRef.current.milestones,
        {
          id: newId(),
          phase_name: (item.phase_name ?? `Phase ${dataRef.current.milestones.length + 1}`).trim(),
          description: (item.description ?? "").trim(),
          expected_outcome: (item.expected_outcome ?? "").trim(),
        },
      ],
    });
  const appendDeliverables = (items: Record<string, string>[]) =>
    onChangeRef.current({
      deliverables: [
        ...dataRef.current.deliverables,
        ...items.map((item) => ({
          id: newId(),
          name: (item.name ?? "").trim(),
          description: (item.description ?? "").trim(),
          delivery_types: [],
          frequency: "weekly" as const,
        })),
      ],
    });
  const appendResources = (items: Record<string, string>[]) =>
    onChangeRef.current({
      resources: [
        ...dataRef.current.resources,
        ...items.map((item) => ({
          id: newId(),
          name: (item.name ?? "").trim(),
          resource_type: (item.resource_type ?? "").trim(),
          description: (item.description ?? "").trim(),
        })),
      ],
    });
  const appendSupports = (items: Record<string, string>[]) =>
    onChangeRef.current({
      support_channels: [
        ...dataRef.current.support_channels,
        ...items.map((item) => ({
          id: newId(),
          name: (item.name ?? "").trim(),
          description: (item.description ?? "").trim(),
          frequency: (item.frequency ?? "").trim(),
        })),
      ],
    });
  const appendBonuses = (items: Record<string, string>[]) =>
    onChangeRef.current({
      bonuses: [
        ...dataRef.current.bonuses,
        ...items.map((item) => ({
          id: newId(),
          name: (item.name ?? "").trim(),
          description: (item.description ?? "").trim(),
          perceived_value: (item.perceived_value ?? "").trim(),
        })),
      ],
    });
  const appendMilestones = (items: Record<string, string>[]) =>
    onChangeRef.current({
      milestones: [
        ...dataRef.current.milestones,
        ...items.map((item, index) => ({
          id: newId(),
          phase_name: (item.phase_name ?? `Phase ${dataRef.current.milestones.length + index + 1}`).trim(),
          description: (item.description ?? "").trim(),
          expected_outcome: (item.expected_outcome ?? "").trim(),
        })),
      ],
    });


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

  const body = (
      <div className="space-y-5">
        {/* Core Deliverables */}
        {show("deliverables") && (
        <BuilderCard
          icon={Package}
          title={STACK_LISTS.deliverables.title}
          description={STACK_LISTS.deliverables.description}
          addLabel={STACK_LISTS.deliverables.addLabel}
          onAdd={addDeliverable}
          onCoach={() =>
            openListCoach({
              ...STACK_LISTS.deliverables.listCoach,
              currentCount: data.deliverables.length,
              appendItem: appendDeliverable,
              appendItems: appendDeliverables,
            })
          }
          count={data.deliverables.length}
          emptyText={STACK_LISTS.deliverables.emptyText}
        >
          {data.deliverables.length > 0 && (
            <div className="space-y-2">
              {data.deliverables.map((d, idx) => (
                <CollapsibleItem
                  key={d.id}
                  title={d.name}
                  fallbackTitle={STACK_LISTS.deliverables.fallbackTitle(idx)}
                  defaultOpen={!d.name}
                  onDelete={() => removeDeliverable(d.id)}
                >
                  <div>
                    <LabelRow
                      label={STACK_LISTS.deliverables.item("name").label}
                      onCoach={() =>
                        openCoach({
                          ...STACK_LISTS.deliverables.itemCoach("name", d.id, idx),
                          currentValue: d.name ?? "",
                          apply: (v) => updateDeliverable(d.id, { name: v }),
                        })
                      }
                    />
                    <Input
                      value={d.name}
                      onChange={(e) => updateDeliverable(d.id, { name: e.target.value })}
                      placeholder={STACK_LISTS.deliverables.item("name").placeholder}
                      className="h-9 font-medium"
                    />
                  </div>
                  <div>
                    <LabelRow
                      label={STACK_LISTS.deliverables.item("description").label}
                      onCoach={() =>
                        openCoach({
                          ...STACK_LISTS.deliverables.itemCoach("description", d.id, idx),
                          currentValue: d.description ?? "",
                          apply: (v) => updateDeliverable(d.id, { description: v }),
                        })
                      }
                    />
                    <AutoTextarea
                      value={d.description ?? ""}
                      onChange={(e) => updateDeliverable(d.id, { description: e.target.value })}
                      placeholder={STACK_LISTS.deliverables.item("description").placeholder}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                  <div className="space-y-3">
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
                        {STACK_LISTS.deliverables.item("frequency").label}
                      </Label>
                      <Select
                        value={d.frequency ?? "weekly"}
                        onValueChange={(v) => updateDeliverable(d.id, { frequency: v as DeliveryFrequency })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={STACK_LISTS.deliverables.item("frequency").placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleItem>
              ))}
            </div>
          )}
        </BuilderCard>
        )}

        {/* Templates & Resources */}
        {show("resources") && (
        <BuilderCard
          icon={Library}
          title={STACK_LISTS.resources.title}
          description={STACK_LISTS.resources.description}
          addLabel={STACK_LISTS.resources.addLabel}
          onAdd={() => addResource()}
          onCoach={() =>
            openListCoach({
              ...STACK_LISTS.resources.listCoach,
              currentCount: data.resources.length,
              appendItem: appendResource,
              appendItems: appendResources,
            })
          }
          count={data.resources.length}
          emptyText={STACK_LISTS.resources.emptyText}
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
              <div className="space-y-2">
                {data.resources.map((r, idx) => (
                  <CollapsibleItem
                    key={r.id}
                    title={r.name}
                    fallbackTitle={STACK_LISTS.resources.fallbackTitle(idx)}
                    defaultOpen={!r.name}
                    onDelete={() => removeResource(r.id)}
                  >
                    <div>
                      <LabelRow
                        label={STACK_LISTS.resources.item("name").label}
                        onCoach={() =>
                          openCoach({
                            ...STACK_LISTS.resources.itemCoach("name", r.id, idx),
                            currentValue: r.name ?? "",
                            apply: (v) => updateResource(r.id, { name: v }),
                          })
                        }
                      />
                      <Input
                        value={r.name}
                        onChange={(e) => updateResource(r.id, { name: e.target.value })}
                        placeholder={STACK_LISTS.resources.item("name").placeholder}
                        className="h-9 font-medium"
                      />
                    </div>
                    <div>
                      <LabelRow
                        label={STACK_LISTS.resources.item("resource_type").label}
                        onCoach={() =>
                          openCoach({
                            ...STACK_LISTS.resources.itemCoach("resource_type", r.id, idx),
                            currentValue: r.resource_type ?? "",
                            apply: (v) => updateResource(r.id, { resource_type: v }),
                          })
                        }
                      />
                      <Input
                        value={r.resource_type ?? ""}
                        onChange={(e) => updateResource(r.id, { resource_type: e.target.value })}
                        placeholder={STACK_LISTS.resources.item("resource_type").placeholder}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <LabelRow
                        label={STACK_LISTS.resources.item("description").label}
                        onCoach={() =>
                          openCoach({
                            ...STACK_LISTS.resources.itemCoach("description", r.id, idx),
                            currentValue: r.description ?? "",
                            apply: (v) => updateResource(r.id, { description: v }),
                          })
                        }
                      />
                      <AutoTextarea
                        value={r.description ?? ""}
                        onChange={(e) => updateResource(r.id, { description: e.target.value })}
                        placeholder={STACK_LISTS.resources.item("description").placeholder}
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  </CollapsibleItem>
                ))}
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Quick-add</p>
                <QuickAddChips options={RESOURCE_QUICK_PICKS} onPick={(v) => addResource(v)} />
              </div>
            </div>
          )}
        </BuilderCard>
        )}

        {/* Support System */}
        {show("support_channels") && (
        <BuilderCard
          icon={MessageCircle}
          title={STACK_LISTS.support_channels.title}
          description={STACK_LISTS.support_channels.description}
          addLabel={STACK_LISTS.support_channels.addLabel}
          onAdd={() => addSupport()}
          onCoach={() =>
            openListCoach({
              ...STACK_LISTS.support_channels.listCoach,
              currentCount: data.support_channels.length,
              appendItem: appendSupport,
              appendItems: appendSupports,
            })
          }
          count={data.support_channels.length}
          emptyText={STACK_LISTS.support_channels.emptyText}
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
              <div className="space-y-2">
                {data.support_channels.map((s, idx) => (
                  <CollapsibleItem
                    key={s.id}
                    title={s.name}
                    fallbackTitle={STACK_LISTS.support_channels.fallbackTitle(idx)}
                    defaultOpen={!s.name}
                    onDelete={() => removeSupport(s.id)}
                  >
                    <div>
                      <LabelRow
                        label={STACK_LISTS.support_channels.item("name").label}
                        onCoach={() =>
                          openCoach({
                            ...STACK_LISTS.support_channels.itemCoach("name", s.id, idx),
                            currentValue: s.name ?? "",
                            apply: (v) => updateSupport(s.id, { name: v }),
                          })
                        }
                      />
                      <Input
                        value={s.name}
                        onChange={(e) => updateSupport(s.id, { name: e.target.value })}
                        placeholder={STACK_LISTS.support_channels.item("name").placeholder}
                        className="h-9 font-medium"
                      />
                    </div>
                    <div>
                      <LabelRow
                        label={STACK_LISTS.support_channels.item("frequency").label}
                        onCoach={() =>
                          openCoach({
                            ...STACK_LISTS.support_channels.itemCoach("frequency", s.id, idx),
                            currentValue: s.frequency ?? "",
                            apply: (v) => updateSupport(s.id, { frequency: v }),
                          })
                        }
                      />
                      <Input
                        value={s.frequency ?? ""}
                        onChange={(e) => updateSupport(s.id, { frequency: e.target.value })}
                        placeholder={STACK_LISTS.support_channels.item("frequency").placeholder}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <LabelRow
                        label={STACK_LISTS.support_channels.item("description").label}
                        onCoach={() =>
                          openCoach({
                            ...STACK_LISTS.support_channels.itemCoach("description", s.id, idx),
                            currentValue: s.description ?? "",
                            apply: (v) => updateSupport(s.id, { description: v }),
                          })
                        }
                      />
                      <AutoTextarea
                        value={s.description ?? ""}
                        onChange={(e) => updateSupport(s.id, { description: e.target.value })}
                        placeholder={STACK_LISTS.support_channels.item("description").placeholder}
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  </CollapsibleItem>
                ))}
              </div>
              <div className="pt-2 border-t border-border/50">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">Quick-add</p>
                <QuickAddChips options={SUPPORT_QUICK_PICKS} onPick={(v) => addSupport(v)} />
              </div>
            </div>
          )}
        </BuilderCard>
        )}

        {/* Bonuses */}
        {show("bonuses") && (
        <BuilderCard
          icon={Gift}
          title={STACK_LISTS.bonuses.title}
          description={STACK_LISTS.bonuses.description}
          addLabel={STACK_LISTS.bonuses.addLabel}
          onAdd={addBonus}
          onCoach={() =>
            openListCoach({
              ...STACK_LISTS.bonuses.listCoach,
              currentCount: data.bonuses.length,
              appendItem: appendBonus,
              appendItems: appendBonuses,
            })
          }
          count={data.bonuses.length}
          emptyText={STACK_LISTS.bonuses.emptyText}
        >
          {data.bonuses.length > 0 && (
            <div className="space-y-2">
              {data.bonuses.map((b, idx) => (
                <CollapsibleItem
                  key={b.id}
                  title={b.name}
                  fallbackTitle={STACK_LISTS.bonuses.fallbackTitle(idx)}
                  defaultOpen={!b.name}
                  onDelete={() => removeBonus(b.id)}
                >
                  <div>
                    <LabelRow
                      label={STACK_LISTS.bonuses.item("name").label}
                      onCoach={() =>
                        openCoach({
                          ...STACK_LISTS.bonuses.itemCoach("name", b.id, idx),
                          currentValue: b.name ?? "",
                          apply: (v) => updateBonus(b.id, { name: v }),
                        })
                      }
                    />
                    <Input
                      value={b.name}
                      onChange={(e) => updateBonus(b.id, { name: e.target.value })}
                      placeholder={STACK_LISTS.bonuses.item("name").placeholder}
                      className="h-9 font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Type
                    </Label>
                    <DeliveryTypePicker
                      value={b.delivery_types ?? []}
                      onChange={(v) => updateBonus(b.id, { delivery_types: v })}
                      placeholder="Pick the bonus type…"
                    />
                  </div>
                  <div>
                    <LabelRow
                      label={STACK_LISTS.bonuses.item("description").label}
                      onCoach={() =>
                        openCoach({
                          ...STACK_LISTS.bonuses.itemCoach("description", b.id, idx),
                          currentValue: b.description ?? "",
                          apply: (v) => updateBonus(b.id, { description: v }),
                        })
                      }
                    />
                    <AutoTextarea
                      value={b.description ?? ""}
                      onChange={(e) => updateBonus(b.id, { description: e.target.value })}
                      placeholder={STACK_LISTS.bonuses.item("description").placeholder}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                  <div>
                    <LabelRow
                      label={STACK_LISTS.bonuses.item("perceived_value").label}
                      onCoach={() =>
                        openCoach({
                          ...STACK_LISTS.bonuses.itemCoach("perceived_value", b.id, idx),
                          currentValue: b.perceived_value ?? "",
                          apply: (v) => updateBonus(b.id, { perceived_value: v }),
                        })
                      }
                    />
                    <Input
                      value={b.perceived_value ?? ""}
                      onChange={(e) => updateBonus(b.id, { perceived_value: e.target.value })}
                      placeholder={STACK_LISTS.bonuses.item("perceived_value").placeholder}
                      className="h-9 text-sm"
                    />
                  </div>
                </CollapsibleItem>
              ))}
            </div>
          )}
        </BuilderCard>
        )}

        {/* Delivery Timeline */}
        {show("timeline") && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <Label className="text-lg font-display font-bold text-foreground">{TIMELINE.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {TIMELINE.helper}
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
        )}

        {/* Milestones */}
        {show("milestones") && (
        <BuilderCard
          icon={Map}
          title={STACK_LISTS.milestones.title}
          description={STACK_LISTS.milestones.description}
          addLabel={STACK_LISTS.milestones.addLabel}
          onAdd={addMilestone}
          onCoach={() =>
            openListCoach({
              ...STACK_LISTS.milestones.listCoach,
              currentCount: data.milestones.length,
              appendItem: appendMilestone,
              appendItems: appendMilestones,
            })
          }
          count={data.milestones.length}
          emptyText={STACK_LISTS.milestones.emptyText}
        >
          {data.milestones.length > 0 && (
            <div className="space-y-2">
              {data.milestones.map((m, idx) => (
                <CollapsibleItem
                  key={m.id}
                  title={m.phase_name}
                  fallbackTitle={STACK_LISTS.milestones.fallbackTitle(idx)}
                  leading={
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                  }
                  defaultOpen={!m.phase_name}
                  onDelete={() => removeMilestone(m.id)}
                >
                  <div>
                    <LabelRow
                      label={STACK_LISTS.milestones.item("phase_name").label}
                      onCoach={() =>
                        openCoach({
                          ...STACK_LISTS.milestones.itemCoach("phase_name", m.id, idx),
                          currentValue: m.phase_name ?? "",
                          apply: (v) => updateMilestone(m.id, { phase_name: v }),
                        })
                      }
                    />
                    <Input
                      value={m.phase_name}
                      onChange={(e) => updateMilestone(m.id, { phase_name: e.target.value })}
                      placeholder={STACK_LISTS.milestones.item("phase_name").placeholder}
                      className="h-9 font-medium"
                    />
                  </div>
                  <div>
                    <LabelRow
                      label={STACK_LISTS.milestones.item("description").label}
                      onCoach={() =>
                        openCoach({
                          ...STACK_LISTS.milestones.itemCoach("description", m.id, idx),
                          currentValue: m.description ?? "",
                          apply: (v) => updateMilestone(m.id, { description: v }),
                        })
                      }
                    />
                    <AutoTextarea
                      value={m.description ?? ""}
                      onChange={(e) => updateMilestone(m.id, { description: e.target.value })}
                      placeholder={STACK_LISTS.milestones.item("description").placeholder}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                  <div>
                    <LabelRow
                      label={STACK_LISTS.milestones.item("expected_outcome").label}
                      onCoach={() =>
                        openCoach({
                          ...STACK_LISTS.milestones.itemCoach("expected_outcome", m.id, idx),
                          currentValue: m.expected_outcome ?? "",
                          apply: (v) => updateMilestone(m.id, { expected_outcome: v }),
                        })
                      }
                    />
                    <AutoTextarea
                      value={m.expected_outcome ?? ""}
                      onChange={(e) => updateMilestone(m.id, { expected_outcome: e.target.value })}
                      placeholder={STACK_LISTS.milestones.item("expected_outcome").placeholder}
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </CollapsibleItem>
              ))}
            </div>
          )}
        </BuilderCard>
        )}
      </div>
  );

  if (bare) return <>{body}{panel}</>;
  return (
    <SectionShell
      icon={Layers}
      title="Offer Stack"
      description="Define exactly what people receive when they buy."
      progress={progress}
      saving={saving}
      embedded={embedded}
      helpButton={<>
          <SectionHelpCoach sectionId="offer_design.stack" sectionLabel="Offer Design — Stack" />
          <SectionHelpCoach variant="walkthrough" sectionId="offer_design.stack" sectionLabel="Offer Design — Stack" />
        </>}
    >
      {body}
      {panel}
    </SectionShell>
  );
};

export default OfferStackTab;
