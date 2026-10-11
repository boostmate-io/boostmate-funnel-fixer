// =============================================================================
// TierOfferDialog — Universal Offer Editor for non-Core categories.
// Tabs, sections, field order, status and wording come from the registry's
// OFFER_TIER_LAYOUTS; fields reuse the existing editor controls (Stack
// builders, Pricing blocks, FrameworkSection, DeliveryTypePicker).
// The shared Coach is scoped to this offer (ID, real category, live tab);
// approved writes go through `persistWrites` (per-offer save queue).
// Persistence belongs to the caller (`onChange` receives the full design).
// =============================================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptionalCoach } from "@/contexts/CoachContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { buildBlueprintFieldContext } from "@/lib/coach/buildContext";
import type { CoachActiveOffer, CoachBlueprintWrite } from "@/lib/coach/types";
import { offerAiPermission } from "@shared/offerAiPolicy";
import CoachIconButton from "./CoachIconButton";
import { applyScopedWrites } from "./useOfferCoach";
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
import { OfferCoachDisabled, OfferCoachScopeProvider, type ScopedOfferCoach, type ScopedPersistResult } from "./OfferCoachScope";
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
  /** Shared Ecosystem (relationships) section, appended to the registry-chosen tab. */
  ecosystemSection?: ReactNode;
  /** Persist approved Coach writes to this offer by ID (enables the Coach). */
  persistWrites?: (writes: CoachBlueprintWrite[]) => Promise<ScopedPersistResult>;
  /** Bump to re-seed from `initial` after a Coach write. */
  externalRevision?: number;
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
  open, onOpenChange, tier, categoryLabel, offerId, initial, onChange, saveStatus, flushChanges, businessType, ecosystemSection,
  persistWrites, externalRevision = 0,
}: Props) {
  const [data, setData] = useState<OfferDesignData>(initial);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (open) { dataRef.current = initial; setData(initial); }
    // Seed on open / offer switch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offerId]);

  // Coach wrote to this offer (saved by ID) — show the merged design.
  useEffect(() => {
    if (open && externalRevision) { dataRef.current = initial; setData(initial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalRevision]);

  const tabRef = useRef<string | null>(null);
  const coach = useOptionalCoach();
  const { activeSubAccountId } = useWorkspace();
  const offerName = data.angle.main_offer_name?.trim() || "this offer";
  const offerNameRef = useRef(offerName);
  offerNameRef.current = offerName;
  const coachScope = useMemo<ScopedOfferCoach | null>(() => persistWrites ? {
    mode: "scoped", offerId, tier,
    get offerName() { return offerNameRef.current; },
    getDesign: () => dataRef.current,
    getTabId: () => tabRef.current,
    persistWrites,
  } as ScopedOfferCoach : null, [offerId, tier, persistWrites]);
  const activeOffer = (): CoachActiveOffer => ({
    id: offerId, isPrimary: false, name: offerNameRef.current, tier,
    getDraftDesign: () => dataRef.current, getTabId: () => tabRef.current ?? undefined,
  });
  const coachOn = !!(coach && coachScope && activeSubAccountId);
  const applyWrites = (writes: CoachBlueprintWrite[]) => applyScopedWrites(coachScope!, writes);
  const snapshot = () => ({ offer_stack: dataRef.current }) as any;

  /** Field-level Coach (registry-permitted paths only). */
  const fieldCoach = (path: string, label: string, currentValue: string) => {
    if (!coachOn || !offerAiPermission(tier, path).write) return null;
    return (
      <CoachIconButton compact onClick={() => {
        const ctx = buildBlueprintFieldContext({ id: path, label, currentValue }, snapshot(), activeSubAccountId!);
        coach!.openCoach({
          key: `offer-field:${path}@offer:${offerId}`, label: `${label} — ${offerNameRef.current}`,
          scope: ctx.scope, intent: ctx.intent, mode: "field", target: ctx.target, blueprintSnapshot: snapshot(),
          activeOffer: activeOffer(),
          onApply: (value) => { void applyWrites([{ path, label, value }]).catch(() => {}); },
          onApplyBlueprintWrites: applyWrites,
        });
      }} />
    );
  };
  /** Section-level Coach: this offer + this section's registry fields only. */
  const sectionCoach = (tabId: string, section: { id: string; label: string; items: OfferLayoutItem[] }) => {
    if (!coachOn) return null;
    const paths = section.items.filter((i) => i.kind !== "relationship").map((i) => (i as { path: string }).path);
    const fields = paths.map((p) => getOfferEditorFieldByPath(p)?.label ?? p);
    return (
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-primary hover:bg-primary/5"
        aria-label={`AI Coach — ${section.label}`}
        onClick={() => coach!.openCoach({
          key: `offer-section:${tabId}.${section.id}@offer:${offerId}`, label: `${section.label} — ${offerNameRef.current}`,
          scope: "blueprint.section", intent: "freeform", mode: "section",
          target: { id: `section:offer_${tier}.${tabId}.${section.id}`, label: section.label, kind: "structured", currentValue: null, subBlockId: tabId,
            helper: `Fields in this section: ${fields.join(", ")}. Only propose changes to these fields (paths: ${paths.join(", ")}).` },
          blueprintSnapshot: snapshot(), activeOffer: activeOffer(), onApplyBlueprintWrites: applyWrites,
        })}>
        <Sparkles className="w-3.5 h-3.5" /><span>AI Coach</span>
      </Button>
    );
  };
  const openOfferCoach = coachOn ? () => coach!.openCoach({
    key: `offer:${offerId}`, label: offerNameRef.current, scope: "global", mode: "general",
    blueprintSnapshot: snapshot(), activeOffer: activeOffer(), onApplyBlueprintWrites: applyWrites,
  }) : undefined;
  /** Label row with an optional field Coach button. */
  const labelRow = (path: string, label: ReactNode, plainLabel: string, value: string, htmlFor?: string, labelId?: string) => (
    <div className="flex items-center justify-between gap-2 mb-1">
      <Label htmlFor={htmlFor} id={labelId} className="text-xs font-medium text-muted-foreground block">{label}</Label>
      {fieldCoach(path, plainLabel, value)}
    </div>
  );

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
      // Relationships are managed in the shared Ecosystem section; only a
      // conditional pointer remains (e.g. Premium "Upgrades from" in Upgrade mode).
      if (!item.visibleWhen) return null;
      const [, sec, k] = item.visibleWhen.path.split(".");
      if ((data as any)[sec]?.[k] !== item.visibleWhen.equals) return null;
      return (
        <p key={`rel:${item.relationship}`} data-relationship-hint={item.relationship} className="text-xs text-muted-foreground">
          <span className="font-medium">{item.label}</span> — link the Core Offer this upgrades from in the Ecosystem section on the Pricing tab.
        </p>
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
          {labelRow(path, copy.label, copy.label, (data.stack.delivery_types ?? []).join(", "), id)}
          <DeliveryTypePicker value={data.stack.delivery_types ?? []} onChange={(v) => updateStack({ delivery_types: v })} placeholder={copy.placeholder} />
        </div>
      );
    }

    if (def?.control === "premium-mode") {
      const v = String(data.angle.premium_mode ?? "");
      return (
        <div key={path}>
          {labelRow(path, copy.label, copy.label, v, undefined, `${id}-label`)}
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
          {labelRow(path, copy.label, copy.label, v.join(", "), undefined, `${id}-label`)}
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
          {labelRow(path, copy.label, copy.label, v, id)}
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

    if (def?.control === "billing-interval") {
      const v = String(data.pricing.recurring_offer?.interval ?? "");
      return (
        <div key={path}>
          {labelRow(path, copy.label, copy.label, v, id)}
          {copy.helper && <p className="text-xs text-muted-foreground mb-1.5">{copy.helper}</p>}
          <select id={id} value={v}
            onChange={(e) => updatePricing({ recurring_offer: { ...(dataRef.current.pricing.recurring_offer ?? {}), interval: (e.target.value || undefined) as any } })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select an interval…</option>
            {(copy.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    if (def?.control === "currency-amount" && path === "offer_stack.pricing.recurring_offer.monthly_price") {
      const raw = data.pricing.recurring_offer?.monthly_price;
      return (
        <div key={path}>
          {labelRow(path, copy.label, copy.label, raw === "" || raw == null ? "" : String(raw), id)}
          {copy.helper && <p className="text-xs text-muted-foreground mb-1.5">{copy.helper}</p>}
          <Input id={id} type="number" inputMode="decimal" min={0} value={raw === "" || raw == null ? "" : String(raw)}
            onChange={(e) => {
              const n = e.target.value === "" ? "" : Number(e.target.value);
              updatePricing({ recurring_offer: { ...(dataRef.current.pricing.recurring_offer ?? {}), monthly_price: n === "" || Number.isFinite(n) ? n : "" } });
            }}
            placeholder={copy.placeholder} className="h-9 text-sm" />
        </div>
      );
    }
    if (def?.path.split(".")[2] === "recurring_offer" || path === "offer_stack.pricing.cancellation_terms") {
      const nested = def?.path.split(".")[2] === "recurring_offer";
      const key = path.split(".").pop()!;
      const value = String(nested ? (data.pricing.recurring_offer as any)?.[key] ?? "" : (data.pricing as any)[key] ?? "");
      const set = (v: string) => nested
        ? updatePricing({ recurring_offer: { ...(dataRef.current.pricing.recurring_offer ?? {}), [key]: v } })
        : updatePricing({ [key]: v } as Partial<PricingData>);
      return (
        <div key={path}>
          {labelRow(path, copy.label, copy.label, value, id)}
          {copy.helper && <p className="text-xs text-muted-foreground mb-1.5">{copy.helper}</p>}
          {def?.kind === "textarea"
            ? <AutoTextarea id={id} value={value} onChange={(e) => set(e.target.value)} placeholder={copy.placeholder} rows={2} className="resize-none text-sm" />
            : <Input id={id} value={value} onChange={(e) => set(e.target.value)} placeholder={copy.placeholder} className="h-9 text-sm" />}
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
        {labelRow(path, <>{copy.label}{required && <span className="text-destructive ml-0.5" aria-hidden>*</span>}</>, copy.label, value, id)}
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
            // Shared relationships section replaces the registry "ecosystem" placeholder.
            if (section.id === "ecosystem") return ecosystemSection ? <div key="ecosystem">{ecosystemSection}</div> : null;
            const shown = section.items.filter((i) => i.kind !== "relationship" || !!i.visibleWhen);
            if (!shown.length) return null;
            const main = shown.filter((i) => i.status !== "optional" || i.kind === "relationship");
            const extra = shown.filter((i) => i.status === "optional" && i.kind !== "relationship");
            // Count visual controls, not paths (framework + guarantee render as one block).
            const extraCount = new Set(extra.map((i) => i.kind === "relationship" ? `rel:${i.relationship}`
              : FRAMEWORK_PATHS.has(i.path) ? "framework" : RENDERED_BY_GROUP.has(i.path) ? "" : i.path).filter(Boolean)).size;
            return (
              <section key={section.id} data-offer-section={section.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-display font-bold text-foreground">{section.label}</h3>
                  {sectionCoach(tab.id, section)}
                </div>
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

  const Scope = ({ children }: { children: ReactNode }) =>
    coachScope ? <OfferCoachScopeProvider value={coachScope}>{children}</OfferCoachScopeProvider> : <OfferCoachDisabled>{children}</OfferCoachDisabled>;
  return (
    <Scope>
      <OfferEditorShell
        open={open}
        onOpenChange={onOpenChange}
        offer={{ id: offerId, name: data.angle.main_offer_name?.trim() || "Untitled Offer", category: categoryLabel, primary: false }}
        tabs={tabs}
        saveStatus={saveStatus}
        flushChanges={flushChanges}
        coachAvailable={coachOn}
        onOpenCoach={openOfferCoach}
        onTabChange={(t) => { tabRef.current = t; }}
      />
    </Scope>
  );
}
