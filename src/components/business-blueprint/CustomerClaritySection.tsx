import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  calculateSubBlockProgress,
  CLARITY_FIELDS,
  type ClaritySubBlock,
  type CustomerClarityData,
} from "./types";
import { getClarityConfig, type FieldDef } from "./clarityConfig";
import { useCoach } from "@/contexts/CoachContext";
import FieldCard from "./FieldCard";
import SectionHelpCoach from "./SectionHelpCoach";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { buildBlueprintFieldContext } from "@/lib/coach/buildContext";
import type { BlueprintRow } from "./types";

interface Props {
  data: CustomerClarityData;
  onChange: (patch: Partial<CustomerClarityData>) => void;
  saving: boolean;
  businessType?: string;
}

const CustomerClaritySection = ({ data, onChange, saving, businessType }: Props) => {
  const [active, setActive] = useState<ClaritySubBlock>("avatar");
  const { activeSubAccountId } = useWorkspace();
  const { openCoach } = useCoach();


  const clarityConfig = useMemo(() => getClarityConfig(businessType), [businessType]);
  const config = clarityConfig.find((c) => c.id === active)!;
  const Icon = config.icon;
  const fields = CLARITY_FIELDS[active];
  
  const progress = calculateSubBlockProgress(data, active);

  const openFieldCoach = (field: FieldDef) => {
    if (!activeSubAccountId) return;
    const snapshot = { customer_clarity: data } as unknown as BlueprintRow;
    const ctx = buildBlueprintFieldContext(
      {
        id: field.key as string,
        label: field.label,
        helper: field.helper,
        placeholder: field.placeholder,
        currentValue: (data[field.key] as string) || "",
        subBlockId: active,
        kind:
          field.type === "tags" || field.type === "suggested-tags"
            ? "tags"
            : field.type === "chips-single" || field.type === "chips-multi"
              ? "chips"
              : "text",
      },
      snapshot,
      activeSubAccountId,
    );
    openCoach({
      key: `customer_clarity.${field.key as string}`,
      label: field.label,
      scope: ctx.scope,
      intent: ctx.intent,
      mode: "field",
      target: ctx.target,
      blueprintSnapshot: snapshot,
      onApply: (value) => onChange({ [field.key]: value } as Partial<CustomerClarityData>),
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab navigation (sticky like Offer Design) */}
      <div className="border-b border-border bg-card px-8 shrink-0">
        <div className="max-w-[1200px] mx-auto flex gap-1 -mb-px overflow-x-auto">
          {clarityConfig.map((sb) => {
            const sbProgress = calculateSubBlockProgress(data, sb.id);
            const isActive = active === sb.id;
            const SbIcon = sb.icon;
            const isComplete = sbProgress === 100;
            return (
              <button
                key={sb.id}
                onClick={() => setActive(sb.id)}
                className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <SbIcon className="w-4 h-4" />
                <span>{sb.label}</span>
                {isComplete ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <span
                    className={`text-[10px] tabular-nums ${
                      isActive ? "text-primary/70" : "text-muted-foreground/70"
                    }`}
                  >
                    {sbProgress}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-display font-bold text-foreground">{config.label}</h2>
                <SectionHelpCoach
                  sectionId={`customer_clarity.${active}`}
                  sectionLabel={`Customer Clarity — ${config.label}`}
                />
                <SectionHelpCoach
                  variant="walkthrough"
                  sectionId={`customer_clarity.${active}`}
                  sectionLabel={`Customer Clarity — ${config.label}`}
                />
              </div>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Badge variant="secondary" className="text-xs">Saving…</Badge>}
            </div>
          </div>



          {/* Modular field cards grid */}
          <div className="space-y-4">
            {config.fields.map((field) => (
              <div
                key={field.key as string}
                className={field.fullWidth ? "lg:col-span-2" : ""}
              >
                <FieldCard
                  field={field}
                  value={(data[field.key] as string) || ""}
                  onChange={(v) => onChange({ [field.key]: v } as Partial<CustomerClarityData>)}
                  onCoach={() => openFieldCoach(field)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};


export default CustomerClaritySection;
