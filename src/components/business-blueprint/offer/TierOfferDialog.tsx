// =============================================================================
// TierOfferDialog — Universal Offer Editor for non-Core categories.
// Tabs, sections, field order, status and wording come from the registry's
// OFFER_TIER_LAYOUTS; fields reuse the existing editor controls (Stack
// builders, Pricing blocks, FrameworkSection, DeliveryTypePicker).
// Coach entry points are disabled inside (no approved Coach support yet).
// Persistence belongs to the caller (`onChange` receives the full design).
// =============================================================================

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  getOfferEditorFieldByPath,
  offerTabsForTier,
  type OfferLayoutItem,
  type OfferTier,
} from "@shared/blueprintRegistry";
import { offerEditorField } from "../registryUi";
import OfferEditorShell, { type OfferEditorTab, type OfferSaveStatus } from "./OfferEditorShell";
import { OfferCoachDisabled } from "./OfferCoachScope";
import OfferStackTab, { type StackBlock } from "./OfferStackTab";
import PricingTab from "./PricingTab";
import FrameworkSection from "./FrameworkSection";
import DeliveryTypePicker from "./DeliveryTypePicker";
import type { OfferAngleData, OfferDesignData, OfferStackData, PricingData } from "../offerDesignTypes";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tier: OfferTier;
  categoryLabel: string;
  offerId: string;
  /** Design to edit — read when the dialog opens. */
  initial: OfferDesignData;
  onChange: (next: OfferDesignData) => void;
  saveStatus?: OfferSaveStatus;
  flushChanges?: () => Promise<boolean>;
  businessType?: string;
}

const STACK_LIST_BLOCK: Record<string, StackBlock> = {
  "offer_stack.stack.deliverables": "deliverables",
  "offer_stack.stack.resources": "resources",
  "offer_stack.stack.support_channels": "support_channels",
  "offer_stack.stack.bonuses": "bonuses",
  "offer_stack.stack.milestones": "milestones",
};
const FRAMEWORK_PATHS = new Set([
  "offer_stack.angle.framework.name",
  "offer_stack.angle.framework.description",
  "offer_stack.angle.framework.pillars",
]);
/** Paths rendered by another item's control (guarantee block renders details). */
const RENDERED_BY_GROUP = new Set(["offer_stack.pricing.guarantee_details"]);

export default function TierOfferDialog({
  open, onOpenChange, tier, categoryLabel, offerId, initial, onChange, saveStatus, flushChanges, businessType,
}: Props) {
  const [data, setData] = useState<OfferDesignData>(initial);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (open) { dataRef.current = initial; setData(initial); }
    // Seed on open / offer switch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offerId]);

  // An empty name never overwrites the saved offer: edits are held locally
  // (with inline validation) and persist together once a valid name exists.
  const update = (next: OfferDesignData) => {
    dataRef.current = next; setData(next);
    if (next.angle.main_offer_name?.trim()) onChange(next);
  };
  const nameMissing = !data.angle.main_offer_name?.trim();
  const updateAngle = (patch: Partial<OfferAngleData>) => update({ ...dataRef.current, angle: { ...dataRef.current.angle, ...patch } });
  const updateStack = (patch: Partial<OfferStackData>) => update({ ...dataRef.current, stack: { ...dataRef.current.stack, ...patch } });
  const updatePricing = (patch: Partial<PricingData>) => update({ ...dataRef.current, pricing: { ...dataRef.current.pricing, ...patch } });

  const renderItem = (item: OfferLayoutItem, rendered: Set<string>): ReactNode => {
    if (item.kind === "relationship") {
      if (item.visibleWhen) {
        const [, sec, k] = item.visibleWhen.path.split(".");
        const cur = (data as any)[sec]?.[k];
        if (cur !== item.visibleWhen.equals) return null;
      }
      return (
        <div key={`rel:${item.relationship}`} className="rounded-lg border border-dashed border-border px-4 py-3">
          <Label className="text-xs font-medium text-muted-foreground">{item.label}</Label>
          <p className="text-xs text-muted-foreground mt-1">Linking this offer to another offer will be available soon.</p>
        </div>
      );
    }
    const path = item.path;
    if (rendered.has(path) || RENDERED_BY_GROUP.has(path)) return null;

    if (FRAMEWORK_PATHS.has(path)) {
      FRAMEWORK_PATHS.forEach((p) => rendered.add(p));
      return (
        <FrameworkSection key="framework" value={data.angle.framework} onChange={(framework) => updateAngle({ framework })} />
      );
    }
    if (path === "offer_stack.stack.delivery_timeline") {
      return (
        <OfferStackTab key={path} bare only={["timeline"]} data={data.stack} onChange={updateStack} saving={false} businessType={businessType} embedded />
      );
    }
    if (item.kind === "list" && STACK_LIST_BLOCK[path]) {
      return (
        <OfferStackTab key={path} bare only={[STACK_LIST_BLOCK[path]]} data={data.stack} onChange={updateStack} saving={false} businessType={businessType} embedded />
      );
    }
    if (path === "offer_stack.pricing.core_price") {
      return <PricingTab key={path} bare only={["core_price"]} tier={tier} data={data.pricing} onChange={updatePricing} saving={false} businessType={businessType} embedded />;
    }
    if (path === "offer_stack.pricing.guarantee_type") {
      return <PricingTab key={path} bare only={["guarantee"]} tier={tier} data={data.pricing} onChange={updatePricing} saving={false} businessType={businessType} embedded />;
    }
    if (path === "offer_stack.pricing.payment_plans") {
      return <PricingTab key={path} bare only={["payment_plans"]} tier={tier} data={data.pricing} onChange={updatePricing} saving={false} businessType={businessType} embedded />;
    }

    const def = getOfferEditorFieldByPath(path);
    const copy = offerEditorField(path, undefined, tier);
    const id = `offer-field-${path.replace(/\./g, "-")}`;
    const required = item.status === "min" && path === "offer_stack.angle.main_offer_name";

    if (path === "offer_stack.stack.delivery_types") {
      return (
        <div key={path}>
          <Label htmlFor={id} className="text-xs font-medium text-muted-foreground mb-1.5 block">{copy.label}</Label>
          <DeliveryTypePicker value={data.stack.delivery_types ?? []} onChange={(v) => updateStack({ delivery_types: v })} placeholder={copy.placeholder} />
        </div>
      );
    }

    if (def?.control === "premium-mode") {
      const v = String(data.angle.premium_mode ?? "");
      return (
        <div key={path}>
          <Label className="text-xs font-medium text-muted-foreground mb-1 block" id={`${id}-label`}>{copy.label}</Label>
          {copy.helper && <p className="text-xs text-muted-foreground mb-1.5">{copy.helper}</p>}
          <ToggleGroup type="single" variant="outline" aria-labelledby={`${id}-label`} value={v}
            onValueChange={(nv) => { if (nv) updateAngle({ premium_mode: nv }); }} className="justify-start flex-wrap">
            {(copy.options ?? []).map((o) => <ToggleGroupItem key={o.value} value={o.value} className="h-8 text-xs">{o.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
      );
    }
    if (def?.control === "touch-level") {
      const v = data.stack.touch_level ?? [];
      return (
        <div key={path}>
          <Label className="text-xs font-medium text-muted-foreground mb-1 block" id={`${id}-label`}>{copy.label}</Label>
          {copy.helper && <p className="text-xs text-muted-foreground mb-1.5">{copy.helper}</p>}
          <ToggleGroup type="multiple" variant="outline" aria-labelledby={`${id}-label`} value={v}
            onValueChange={(nv) => updateStack({ touch_level: nv })} className="justify-start flex-wrap">
            {(copy.options ?? []).map((o) => <ToggleGroupItem key={o.value} value={o.value} className="h-8 text-xs">{o.label}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
      );
    }
    if (def?.control === "offer-format") {
      const v = String(data.angle.offer_format ?? "");
      return (
        <div key={path}>
          <Label htmlFor={id} className="text-xs font-medium text-muted-foreground mb-1 block">{copy.label}</Label>
          {copy.helper && <p className="text-xs text-muted-foreground mb-1.5">{copy.helper}</p>}
          <select
            id={id}
            value={v}
            onChange={(e) => updateAngle({ offer_format: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a format…</option>
            {(copy.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }

    // Plain angle text fields (name, description, problem solved, quick win, outcome…)
    const [, section, key] = path.split(".");
    if (section !== "angle" || !key) return null;
    const value = String((data.angle as Record<string, unknown>)[key] ?? "");
    const set = (v: string) => updateAngle({ [key]: v } as Partial<OfferAngleData>);
    const invalid = required && nameMissing;
    return (
      <div key={path}>
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground mb-1 block">
          {copy.label}{required && <span className="text-destructive ml-0.5" aria-hidden>*</span>}
        </Label>
        {copy.helper && <p className="text-xs text-muted-foreground mb-1.5">{copy.helper}</p>}
        {def?.kind === "textarea" ? (
          <AutoTextarea id={id} value={value} onChange={(e) => set(e.target.value)} placeholder={copy.placeholder} rows={2} className="resize-none text-sm" />
        ) : (
          <Input id={id} value={value} onChange={(e) => set(e.target.value)} placeholder={copy.placeholder} className={`h-9 text-sm ${invalid ? "border-destructive" : ""}`} aria-required={required || undefined} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} />
        )}
        {invalid && (
          <p id={`${id}-error`} role="alert" className="text-xs text-destructive mt-1">
            Offer Name is required. Changes are saved once a name is entered.
          </p>
        )}
      </div>
    );
  };

  const tabs: OfferEditorTab[] = offerTabsForTier(tier).map((tab) => {
    const rendered = new Set<string>();
    return {
      id: tab.id,
      label: tab.label,
      content: (
        <div className="space-y-6">
          {tab.sections.map((section) => {
            const main = section.items.filter((i) => i.status !== "optional");
            const extra = section.items.filter((i) => i.status === "optional");
            // Count visual controls, not paths (framework + guarantee render as one block).
            const extraCount = new Set(extra.map((i) => i.kind === "relationship" ? `rel:${i.relationship}`
              : FRAMEWORK_PATHS.has(i.path) ? "framework" : RENDERED_BY_GROUP.has(i.path) ? "" : i.path).filter(Boolean)).size;
            return (
              <section key={section.id} data-offer-section={section.id} className="space-y-3">
                <h3 className="text-base font-display font-bold text-foreground">{section.label}</h3>
                {main.map((i) => renderItem(i, rendered))}
                {extra.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="group flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                      More options
                      <Badge variant="secondary" className="text-[10px]">{extraCount}</Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-3">
                      {extra.map((i) => renderItem(i, rendered))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </section>
            );
          })}
        </div>
      ),
    };
  });

  return (
    <OfferCoachDisabled>
      <OfferEditorShell
        open={open}
        onOpenChange={onOpenChange}
        offer={{ id: offerId, name: data.angle.main_offer_name?.trim() || "Untitled Offer", category: categoryLabel, primary: false }}
        tabs={tabs}
        saveStatus={saveStatus}
        flushChanges={flushChanges}
        coachAvailable={false}
      />
    </OfferCoachDisabled>
  );
}
