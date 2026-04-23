// =============================================================================
// PricingTab — Tab 3
// Numeric core price, payment plan builder, recurring & premium toggles,
// guarantee dropdown.
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
import {
  type PricingData,
  type PaymentPlan,
  type PaymentPlanType,
  type GuaranteeType,
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

        {/* Recurring */}
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
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Recurring price</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">€</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={data.recurring_price === "" || data.recurring_price === undefined ? "" : data.recurring_price}
                    onChange={(e) => onChange({ recurring_price: numberOrEmpty(e.target.value) })}
                    placeholder="297"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Interval</Label>
                <Select
                  value={data.recurring_interval ?? "monthly"}
                  onValueChange={(v) => onChange({ recurring_interval: v as PricingData["recurring_interval"] })}
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
          )}
        </div>

        {/* Premium upsell */}
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
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</Label>
                  <Input
                    value={data.premium_upgrade?.name ?? ""}
                    onChange={(e) =>
                      onChange({
                        premium_upgrade: {
                          name: e.target.value,
                          price: data.premium_upgrade?.price ?? "",
                          description: data.premium_upgrade?.description,
                        },
                      })
                    }
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
                      onChange={(e) =>
                        onChange({
                          premium_upgrade: {
                            name: data.premium_upgrade?.name ?? "",
                            price: numberOrEmpty(e.target.value),
                            description: data.premium_upgrade?.description,
                          },
                        })
                      }
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
                  onChange={(e) =>
                    onChange({
                      premium_upgrade: {
                        name: data.premium_upgrade?.name ?? "",
                        price: data.premium_upgrade?.price ?? "",
                        description: e.target.value,
                      },
                    })
                  }
                  placeholder="What's included in the premium tier?"
                  rows={2}
                  className="resize-none text-sm"
                />
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
          <div className="max-w-md space-y-3">
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
            {data.guarantee_type === "custom" && (
              <Textarea
                value={data.guarantee_custom ?? ""}
                onChange={(e) => onChange({ guarantee_custom: e.target.value })}
                placeholder="Describe your custom guarantee…"
                rows={3}
                className="resize-none text-sm"
              />
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
};

export default PricingTab;
