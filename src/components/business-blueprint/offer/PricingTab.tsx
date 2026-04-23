// =============================================================================
// PricingTab — Tab 3 (redesigned)
// Structured Premium Upgrade and Recurring Offer mini-builders.
// Guarantee details textarea added.
// =============================================================================

import { DollarSign, Trash2, Repeat, Crown, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SectionShell from "./SectionShell";
import BuilderCard from "./BuilderCard";
import DeliveryTypePicker from "./DeliveryTypePicker";
import {
  type PricingData,
  type PaymentPlan,
  type PaymentPlanType,
  type GuaranteeType,
  type PremiumUpgrade,
  type RecurringOffer,
  PAYMENT_PLAN_TYPES,
  GUARANTEE_OPTIONS,
  calcPricingProgress,
} from "../offerDesignTypes";
import { getBusinessType } from "../businessTypes";

const newId = () => crypto.randomUUID();

interface Props {
  data: PricingData;
  onChange: (patch: Partial<PricingData>) => void;
  saving: boolean;
  businessType?: string;
}

const numberOrEmpty = (raw: string): number | "" => {
  if (raw.trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : "";
};

const PricingTab = ({ data, onChange, saving, businessType }: Props) => {
  const bt = getBusinessType(businessType);
  const progress = calcPricingProgress(data);

  // Payment plans
  const addPlan = () =>
    onChange({
      payment_plans: [...data.payment_plans, { id: newId(), type: "full_pay", amount: "", duration: "" }],
    });
  const updatePlan = (id: string, patch: Partial<PaymentPlan>) =>
    onChange({ payment_plans: data.payment_plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const removePlan = (id: string) =>
    onChange({ payment_plans: data.payment_plans.filter((p) => p.id !== id) });

  // Premium upgrade
  const updatePremium = (patch: Partial<PremiumUpgrade>) =>
    onChange({
      premium_upgrade: {
        ...(data.premium_upgrade ?? {}),
        ...patch,
      },
    });

  // Recurring offer
  const updateRecurring = (patch: Partial<RecurringOffer>) =>
    onChange({
      recurring_offer: {
        ...(data.recurring_offer ?? { interval: "monthly" }),
        ...patch,
      },
    });

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
      insight="Smart pricing creates options. Anchor with premium, give a flexible plan, and reverse risk so buying is the safe choice."
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
        {/* Core Price */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground">Core Price</Label>
              <p className="text-xs text-muted-foreground mt-0.5">The headline price for your main offer.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 max-w-xs">
            <span className="text-lg font-semibold text-muted-foreground">€</span>
            <Input
              type="number"
              inputMode="decimal"
              value={data.core_price === "" ? "" : data.core_price}
              onChange={(e) => onChange({ core_price: numberOrEmpty(e.target.value) })}
              placeholder="2500"
              className="h-10 text-lg font-semibold"
            />
          </div>
        </div>

        {/* Payment Plans */}
        <BuilderCard
          title="Payment Plans"
          description="Lower the upfront barrier with flexible options."
          addLabel="Add Payment Plan"
          onAdd={addPlan}
          count={data.payment_plans.length}
          emptyText="No plans yet. Most offers convert better with at least 2 options (e.g. Full Pay + 3-Pay)."
        >
          {data.payment_plans.length > 0 && (
            <div className="space-y-2">
              {data.payment_plans.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-background p-3 grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 sm:col-span-4">
                    <Select value={p.type} onValueChange={(v) => updatePlan(p.id, { type: v as PaymentPlanType })}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_PLAN_TYPES.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {p.type === "custom" && (
                      <Input
                        value={p.custom_label ?? ""}
                        onChange={(e) => updatePlan(p.id, { custom_label: e.target.value })}
                        placeholder="Plan label"
                        className="h-8 text-sm mt-2"
                      />
                    )}
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">€</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={p.amount === "" ? "" : p.amount}
                        onChange={(e) => updatePlan(p.id, { amount: numberOrEmpty(e.target.value) })}
                        placeholder="Amount"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-5 sm:col-span-4">
                    <Input
                      value={p.duration ?? ""}
                      onChange={(e) => updatePlan(p.id, { duration: e.target.value })}
                      placeholder="Duration (e.g. 3 months)"
                      className="h-9 text-sm"
                    />
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
        </BuilderCard>

        {/* Premium upsell — structured card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground">Premium Upgrade Option</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Does this offer have a premium upsell that anchors the core price?
                </p>
              </div>
            </div>
            <Switch
              checked={data.premium_enabled}
              onCheckedChange={(v) => onChange({ premium_enabled: v })}
            />
          </div>
          {data.premium_enabled && (
            <div className="mt-4 rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Upgrade Name</Label>
                  <Input
                    value={data.premium_upgrade?.name ?? ""}
                    onChange={(e) => updatePremium({ name: e.target.value })}
                    placeholder="VIP Day, Done-for-You package…"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">€</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={data.premium_upgrade?.price === "" || data.premium_upgrade?.price === undefined ? "" : data.premium_upgrade?.price}
                      onChange={(e) => updatePremium({ price: numberOrEmpty(e.target.value) })}
                      placeholder="7500"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</Label>
                <Textarea
                  value={data.premium_upgrade?.description ?? ""}
                  onChange={(e) => updatePremium({ description: e.target.value })}
                  placeholder="What's included in the premium tier?"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Additional Value / Outcome
                </Label>
                <Textarea
                  value={data.premium_upgrade?.additional_value ?? ""}
                  onChange={(e) => updatePremium({ additional_value: e.target.value })}
                  placeholder="What additional outcome does this unlock?"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Recurring — structured offer card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground">Recurring Option</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Does this offer have a recurring continuation offer?
                </p>
              </div>
            </div>
            <Switch
              checked={data.recurring_enabled}
              onCheckedChange={(v) => onChange({ recurring_enabled: v })}
            />
          </div>
          {data.recurring_enabled && (
            <div className="mt-4 rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Offer Name</Label>
                  <Input
                    value={data.recurring_offer?.name ?? ""}
                    onChange={(e) => updateRecurring({ name: e.target.value })}
                    placeholder="e.g. Inner Circle Membership"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Monthly Price</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">€</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={data.recurring_offer?.monthly_price === "" || data.recurring_offer?.monthly_price === undefined ? "" : data.recurring_offer?.monthly_price}
                      onChange={(e) => updateRecurring({ monthly_price: numberOrEmpty(e.target.value) })}
                      placeholder="297"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</Label>
                <Textarea
                  value={data.recurring_offer?.description ?? ""}
                  onChange={(e) => updateRecurring({ description: e.target.value })}
                  placeholder="What is the recurring offer?"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Ongoing Value Delivered
                </Label>
                <Textarea
                  value={data.recurring_offer?.ongoing_value ?? ""}
                  onChange={(e) => updateRecurring({ ongoing_value: e.target.value })}
                  placeholder="What value is delivered every month?"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Delivery Type</Label>
                  <DeliveryTypePicker
                    value={data.recurring_offer?.delivery_types ?? []}
                    onChange={(v) => updateRecurring({ delivery_types: v })}
                    placeholder="How is it delivered?"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Interval</Label>
                  <Select
                    value={data.recurring_offer?.interval ?? "monthly"}
                    onValueChange={(v) => updateRecurring({ interval: v as RecurringOffer["interval"] })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Guarantee */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground">Risk Reversal / Guarantee</Label>
              <p className="text-xs text-muted-foreground mt-0.5">How you remove the risk of saying yes.</p>
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
                  {GUARANTEE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data.guarantee_type !== "none" && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Guarantee Details / Terms
                </Label>
                <Textarea
                  value={data.guarantee_details ?? ""}
                  onChange={(e) => onChange({ guarantee_details: e.target.value })}
                  placeholder={
                    'e.g. "Complete all modules and attend weekly calls. If you don\'t see measurable progress within 90 days, we continue coaching for free."'
                  }
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
};

export default PricingTab;
