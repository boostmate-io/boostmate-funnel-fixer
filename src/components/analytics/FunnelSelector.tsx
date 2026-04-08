import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Funnel {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
}

interface FunnelSelectorProps {
  selectedFunnelId: string | null;
  onSelect: (funnel: Funnel | null) => void;
}

const FunnelSelector = ({ selectedFunnelId, onSelect }: FunnelSelectorProps) => {
  const { t } = useTranslation();
  const { activeSubAccountId } = useWorkspace();
  const [funnels, setFunnels] = useState<Funnel[]>([]);

  useEffect(() => {
    if (!activeSubAccountId) return;
    const load = async () => {
      const { data } = await supabase
        .from("funnels")
        .select("id, name, nodes, edges")
        .eq("sub_account_id", activeSubAccountId)
        .eq("is_template", false)
        .order("updated_at", { ascending: false });
      if (data) {
        const mapped = data.map((f) => ({
          ...f,
          nodes: Array.isArray(f.nodes) ? f.nodes : [],
          edges: Array.isArray(f.edges) ? f.edges : [],
        }));
        setFunnels(mapped);
        if (!selectedFunnelId && mapped.length > 0) onSelect(mapped[0]);
      }
    };
    load();
  }, [activeSubAccountId]);

  return (
    <Select
      value={selectedFunnelId || ""}
      onValueChange={(id) => {
        const f = funnels.find((x) => x.id === id) || null;
        onSelect(f);
      }}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder={t("analytics.selectFunnel")} />
      </SelectTrigger>
      <SelectContent>
        {funnels.map((f) => (
          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default FunnelSelector;
