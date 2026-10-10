// =============================================================================
// PricingTab — Tab 3 (redesigned)
// AI Coach entry point on every editable text field. Numeric-only fields
// (price, amount) don't get a Coach button — nothing to draft.
// =============================================================================

import { DollarSign, Trash2, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SectionShell from "./SectionShell";
import SectionHelpCoach from "../SectionHelpCoach";
import BuilderCard from "./BuilderCard";
import CoachIconButton from "./CoachIconButton";
import { useOfferCoach } from "./useOfferCoach";
import { useLatestRef } from "@/lib/coach/useLatestRef";
import {
  type PricingData,
  type PaymentPlan,
  type PaymentPlanType,
  type GuaranteeType,
  calcPricingProgress,
} from "../offerDesignTypes";
import { getBusinessType } from "../businessTypes";
import { offerEditorField, offerEditorList } from "../registryUi";
import type { OfferTier } from "@shared/blueprintRegistry";

// Field semantics + copy come from the central Blueprint Field Registry.
const CORE_PRICE_CORE = offerEditorField("offer_stack.pricing.core_price");
const GUARANTEE_TYPE = offerEditorField("offer_stack.pricing.guarantee_type");
const GUARANTEE_DETAILS = offerEditorField("offer_stack.pricing.guarantee_details");
const PLANS_PATH = "offer_stack.pricing.payment_plans";

const newId = () => crypto.randomUUID();

interface Props {
  data: PricingData;
  onChange: (patch: Partial<PricingData>) => void;
  saving: boolean;
  businessType?: string;
  embedded?: boolean;
  /** Render only these blocks (category editors). Default: all. */
  only?: PricingBlock[];
  /** Render without the section header (embedded inside another layout). */
  bare?: boolean;
  /** Category for tier-specific registry wording (Core: omit). */
  tier?: OfferTier;
}

export type PricingBlock = "core_price" | "payment_plans" | "guarantee";

const numberOrEmpty = (raw: string): number | "" => {
  if (raw.trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : "";
};

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

const PricingTab = ({ data, onChange, saving, businessType, embedded, only, bare, tier }: Props) => {
  const show = (b: PricingBlock) => !only || only.includes(b);
  const CORE_PRICE = tier ? offerEditorField("offer_stack.pricing.core_price", undefined, tier) : CORE_PRICE_CORE;
  const { symbol: cur } = useCurrency();
  const bt = getBusinessType(businessType);
  const progress = calcPricingProgress(data);
  const { openCoach, openListCoach, panel } = useOfferCoach(() => ({ offer_stack: { pricing: data } }));

  // Refs so Coach-captured callbacks always read the LATEST data/onChange,
  // not the snapshot from the render when the Coach button was clicked.
  const PLANS = offerEditorList(PLANS_PATH, { cur });
  const planTypeOptions = PLANS.item("type").options ?? [];
  const dataRef = useLatestRef(data);
  const onChangeRef = useLatestRef(onChange);

  // Payment plans
  const addPlan = () =>
    onChange({
      payment_plans: [...data.payment_plans, { id: newId(), type: "full_pay", amount: "", duration: "" }],
    });
  const updatePlan = (id: string, patch: Partial<PaymentPlan>) =>
    onChange({ payment_plans: data.payment_plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const removePlan = (id: string) =>
    onChange({ payment_plans: data.payment_plans.filter((p) => p.id !== id) });

  const parseAmount = (raw: string): number | "" => {
    const s = String(raw ?? "").trim();
    if (!s) return "";
    const n = Number(s);
    return Number.isFinite(n) ? n : "";
  };
  const normalizePlanType = (raw: string): PaymentPlanType => {
    const allowed: PaymentPlanType[] = ["full_pay", "split_2", "split_3", "split_6", "monthly", "custom"];
    const t = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_") as PaymentPlanType;
    return (allowed as string[]).includes(t) ? t : "custom";
  };

  const appendPlan = (item: Record<string, string>) =>
    onChangeRef.current({
      payment_plans: [
        ...dataRef.current.payment_plans,
        {
          id: newId(),
          type: normalizePlanType(item.type ?? "custom"),
          custom_label: (item.custom_label ?? "").trim(),
          amount: parseAmount(item.amount ?? ""),
          duration: (item.duration ?? "").trim(),
        },
      ],
    });
  const appendPlans = (items: Record<string, string>[]) =>
    onChangeRef.current({
      payment_plans: [
        ...dataRef.current.payment_plans,
        ...items.map((item) => ({
          id: newId(),
          type: normalizePlanType(item.type ?? "custom"),
          custom_label: (item.custom_label ?? "").trim(),
          amount: parseAmount(item.amount ?? ""),
          duration: (item.duration ?? "").trim(),
        })),
      ],
    });

  // Premium upgrade / Recurring updaters removed with the UI blocks (V3).



  const feedback =
    progress >= 100
      ? "Excellent. Your pricing now sells itself."
      : progress >= 80
      ? "Strong pricing — buyers see value at every tier."
      : progress >= 50
      ? "Pricing is taking shape. Keep layering options."
      : null;

  return (
    <SectionShell
      icon={DollarSign}
      title="Pricing"
      description="Monetize your offer with confidence — anchored, flexible and risk-reversed."
      progress={progress}
      saving={saving}
      embedded={embedded}
      helpButton={<>
          <SectionHelpCoach sectionId="offer_design.pricing" sectionLabel="Offer Design — Pricing" />
          <SectionHelpCoach variant="walkthrough" sectionId="offer_design.pricing" sectionLabel="Offer Design — Pricing" />
        </>}
    >
      <div className="space-y-5">
        {/* Core Price */}
        {show("core_price") && <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-lg font-display font-bold text-foreground">{CORE_PRICE.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{CORE_PRICE.helper}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 max-w-xs">
            <span className="text-lg font-semibold text-muted-foreground">{cur}</span>
            <Input
              type="number"
              inputMode="decimal"
              value={data.core_price === "" ? "" : data.core_price}
              onChange={(e) => onChange({ core_price: numberOrEmpty(e.target.value) })}
              placeholder={CORE_PRICE.placeholder}
              className="h-10 text-lg font-semibold"
            />
          </div>
        </div>

        {/* Payment Plans */}
        {show("payment_plans") && <BuilderCard
          title={PLANS.title}
          description={PLANS.description}
          addLabel={PLANS.addLabel}
          onAdd={addPlan}
          onCoach={() =>
            openListCoach({
              ...PLANS.listCoach,
              suggestedCount: PLANS.listCoach.suggestedCount ?? [2, 3],
              currentCount: data.payment_plans.length,
              appendItem: appendPlan,
              appendItems: appendPlans,
            })
          }
          count={data.payment_plans.length}
          emptyText={PLANS.emptyText}
        >
          {data.payment_plans.length > 0 && (
            <div className="space-y-2">
              {data.payment_plans.map((p, idx) => (
                <div key={p.id} className="rounded-lg border border-border bg-background p-3 grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 sm:col-span-4">
                    <Select value={p.type} onValueChange={(v) => updatePlan(p.id, { type: v as PaymentPlanType })}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {planTypeOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {p.type === "custom" && (
                      <div className="mt-2 flex items-center gap-1">
                        <Input
                          value={p.custom_label ?? ""}
                          onChange={(e) => updatePlan(p.id, { custom_label: e.target.value })}
                          placeholder={PLANS.item("custom_label").placeholder}
                          className="h-8 text-sm"
                        />
                        <CoachIconButton
                          compact
                          onClick={() =>
                            openCoach({
                              ...PLANS.itemCoach("custom_label", p.id, idx),
                              currentValue: p.custom_label ?? "",
                              apply: (v) => updatePlan(p.id, { custom_label: v }),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">{cur}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={p.amount === "" ? "" : p.amount}
                        onChange={(e) => updatePlan(p.id, { amount: numberOrEmpty(e.target.value) })}
                        placeholder={PLANS.item("amount").placeholder}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-5 sm:col-span-4">
                    <div className="flex items-center gap-1">
                      <Input
                        value={p.duration ?? ""}
                        onChange={(e) => updatePlan(p.id, { duration: e.target.value })}
                        placeholder={PLANS.item("duration").placeholder}
                        className="h-9 text-sm"
                      />
                      <CoachIconButton
                        compact
                        onClick={() =>
                          openCoach({
                            ...PLANS.itemCoach("duration", p.id, idx),
                            currentValue: p.duration ?? "",
                            apply: (v) => updatePlan(p.id, { duration: v }),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removePlan(p.id)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BuilderCard>}

        {/* Premium Upgrade and Recurring Option removed per V3 spec. */}


        {/* Guarantee */}
        {show("guarantee") && <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <Label className="text-lg font-display font-bold text-foreground">{GUARANTEE_TYPE.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{GUARANTEE_TYPE.helper}</p>
            </div>
          </div>
          <div className="space-y-3 max-w-2xl">
            <div className="max-w-xs">
              <Select
                value={data.guarantee_type}
                onValueChange={(v) => onChange({ guarantee_type: v as GuaranteeType })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(GUARANTEE_TYPE.options ?? []).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data.guarantee_type !== "none" && (
              <div>
                <LabelRow
                  label={GUARANTEE_DETAILS.label}
                  onCoach={() =>
                    openCoach({
                      ...GUARANTEE_DETAILS.coach,
                      currentValue: data.guarantee_details ?? "",
                      apply: (v) => onChange({ guarantee_details: v }),
                    })
                  }
                />
                <AutoTextarea
                  value={data.guarantee_details ?? ""}
                  onChange={(e) => onChange({ guarantee_details: e.target.value })}
                  placeholder={GUARANTEE_DETAILS.placeholder}
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {panel}
    </SectionShell>
  );
};

export default PricingTab;
