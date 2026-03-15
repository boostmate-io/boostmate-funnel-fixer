import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
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
  const { activeProject } = useProject();
  const [funnels, setFunnels] = useState<Funnel[]>([]);

  useEffect(() => {
    if (!activeProject) return;
    const load = async () => {
      const { data } = await supabase
        .from("funnels")
        .select("id, name, nodes, edges")
        .eq("project_id", activeProject.id)
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
  }, [activeProject]);

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
