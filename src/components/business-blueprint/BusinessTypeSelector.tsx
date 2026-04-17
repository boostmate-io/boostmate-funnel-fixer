import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { BUSINESS_TYPE_LIST, getBusinessType, type BusinessTypeId } from "./businessTypes";

interface Props {
  value?: string;
  onChange: (next: BusinessTypeId) => void;
  /** Compact pill (used in Overview header) vs full list (used in Settings). */
  variant?: "pill" | "list";
}

const BusinessTypeSelector = ({ value, onChange, variant = "pill" }: Props) => {
  const current = getBusinessType(value);
  const Icon = current.icon;

  if (variant === "list") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {BUSINESS_TYPE_LIST.map((bt) => {
          const ItemIcon = bt.icon;
          const active = bt.id === current.id;
          return (
            <button
              key={bt.id}
              onClick={() => onChange(bt.id)}
              className={`text-left rounded-lg border p-3 transition-all ${
                active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ItemIcon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-semibold text-sm text-foreground">{bt.label}</span>
                {active && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{bt.shortDescription}</p>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Icon className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">{current.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="px-2 py-1.5 mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Business type
          </p>
          <p className="text-[11px] text-muted-foreground">
            Adapts examples & AI across your blueprint.
          </p>
        </div>
        <div className="space-y-0.5">
          {BUSINESS_TYPE_LIST.map((bt) => {
            const ItemIcon = bt.icon;
            const active = bt.id === current.id;
            return (
              <button
                key={bt.id}
                onClick={() => onChange(bt.id)}
                className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  active ? "bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <ItemIcon className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm ${active ? "text-primary font-medium" : "text-foreground"}`}>
                  {bt.label}
                </span>
                {active && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BusinessTypeSelector;
