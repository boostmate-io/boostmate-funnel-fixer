import { useOutreachLeads, type OutreachLead } from "./useOutreachData";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const PIPELINE_STATUSES = [
  { key: "new", label: "New", color: "bg-blue-50 border-blue-200" },
  { key: "drafted", label: "Drafted", color: "bg-yellow-50 border-yellow-200" },
  { key: "ready_to_send", label: "Ready to Send", color: "bg-green-50 border-green-200" },
  { key: "sent", label: "Sent", color: "bg-purple-50 border-purple-200" },
  { key: "replied", label: "Replied", color: "bg-emerald-50 border-emerald-200" },
  { key: "interested", label: "Interested", color: "bg-orange-50 border-orange-200" },
  { key: "closed", label: "Closed", color: "bg-gray-50 border-gray-200" },
  { key: "no_response", label: "No Response", color: "bg-red-50 border-red-200" },
];

interface Props { onRefresh: () => void; }

const OutreachPipeline = ({ onRefresh }: Props) => {
  const { leads, loading, refresh } = useOutreachLeads();

  const moveToStatus = async (leadId: string, newStatus: string) => {
    await supabase.from("outreach_leads").update({ status: newStatus } as any).eq("id", leadId);
    refresh();
    toast.success(`Moved to ${newStatus.replace(/_/g, " ")}`);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
      {PIPELINE_STATUSES.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.key);
        return (
          <div
            key={col.key}
            className={`flex-shrink-0 w-56 rounded-lg border ${col.color} p-3`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const leadId = e.dataTransfer.getData("leadId");
              if (leadId) moveToStatus(leadId, col.key);
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">{col.label}</h4>
              <Badge variant="secondary" className="text-xs">{colLeads.length}</Badge>
            </div>
            <div className="space-y-2">
              {colLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id)}
                  className="bg-card border border-border rounded-md p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-shadow"
                >
                  <p className="font-medium text-sm truncate">{lead.name}</p>
                  {lead.company_name && <p className="text-xs text-muted-foreground truncate">{lead.company_name}</p>}
                  <div className="flex items-center gap-1 mt-2">
                    <Badge variant="outline" className="text-xs uppercase">{lead.outreach_channel}</Badge>
                    {lead.setup_type && <Badge variant="secondary" className="text-xs truncate max-w-20">{lead.setup_type}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OutreachPipeline;
