import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  label: string;
}

interface Props {
  value: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
}

const AnalyticsPeriodFilter = ({ value, onChange }: Props) => {
  const { t } = useTranslation();
  const [customOpen, setCustomOpen] = useState(false);

  const setPreset = (label: string) => {
    const today = new Date();
    if (label === "last7") onChange({ start: subDays(today, 7), end: today, label });
    else if (label === "last30") onChange({ start: subDays(today, 30), end: today, label });
    else if (label === "last90") onChange({ start: subDays(today, 90), end: today, label });
    else if (label === "thisMonth") onChange({ start: startOfMonth(today), end: today, label });
    else if (label === "lastMonth") {
      const lm = subMonths(today, 1);
      onChange({ start: startOfMonth(lm), end: endOfMonth(lm), label });
    } else if (label === "ytd") onChange({ start: startOfYear(today), end: today, label });
    else if (label === "all") onChange({ start: new Date(2000, 0, 1), end: today, label });
    else if (label === "custom") {
      onChange({ start: value.start, end: value.end, label: "custom" });
      setCustomOpen(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value.label} onValueChange={setPreset}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last7">{t("analytics.filter.last7") || "Last 7 days"}</SelectItem>
          <SelectItem value="last30">{t("analytics.filter.last30") || "Last 30 days"}</SelectItem>
          <SelectItem value="last90">{t("analytics.filter.last90") || "Last 90 days"}</SelectItem>
          <SelectItem value="thisMonth">{t("analytics.filter.thisMonth") || "This month"}</SelectItem>
          <SelectItem value="lastMonth">{t("analytics.filter.lastMonth") || "Last month"}</SelectItem>
          <SelectItem value="ytd">{t("analytics.filter.ytd") || "Year to date"}</SelectItem>
          <SelectItem value="all">{t("analytics.filter.all") || "All time"}</SelectItem>
          <SelectItem value="custom">{t("analytics.filter.custom") || "Custom"}</SelectItem>
        </SelectContent>
      </Select>

      {value.label === "custom" && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(value.start, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={value.start} onSelect={(d) => d && onChange({ ...value, start: d })} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">–</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(value.end, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={value.end} onSelect={(d) => d && onChange({ ...value, end: d })} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
};

export default AnalyticsPeriodFilter;
