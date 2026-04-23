// =============================================================================
// TimeframePicker — dropdown with "Custom" fallback to text input.
// =============================================================================

import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TIMEFRAME_OPTIONS, type TimeframeOption } from "../offerDesignTypes";

interface Props {
  value: TimeframeOption | "";
  customValue?: string;
  onChange: (value: TimeframeOption | "", customValue?: string) => void;
  placeholder?: string;
}

const TimeframePicker = ({ value, customValue, onChange, placeholder = "Choose timeframe…" }: Props) => (
  <div className="space-y-2">
    <Select
      value={value || undefined}
      onValueChange={(v) => onChange(v as TimeframeOption, customValue)}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {TIMEFRAME_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    {value === "custom" && (
      <Input
        autoFocus
        value={customValue ?? ""}
        onChange={(e) => onChange("custom", e.target.value)}
        placeholder="e.g. 14 weeks, 2 quarters…"
        className="h-9"
      />
    )}
  </div>
);

export default TimeframePicker;
