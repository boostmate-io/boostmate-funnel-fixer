import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import BriefFiller from "@/components/funnel-brief/BriefFiller";
import { BriefStructure, BriefValues, FunnelBrief } from "@/components/funnel-brief/types";
import logo from "@/assets/logo-boostmate.svg";

const SharedBrief = () => {
  const { token } = useParams<{ token: string }>();
  const [brief, setBrief] = useState<FunnelBrief | null>(null);
  const [funnelName, setFunnelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [values, setValues] = useState<BriefValues>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("funnel_briefs")
        .select("*")
        .eq("share_token", token)
        .maybeSingle();

      if (err || !data) {
        setError(true);
      } else {
        const b = data as any;
        setBrief({
          ...b,
          structure: b.structure || { sections: [] },
          values: b.values || {},
        } as FunnelBrief);
        setValues(b.values || {});

        // Fetch funnel name separately
        if (b.funnel_id) {
          const { data: funnelData } = await supabase
            .from("funnels")
            .select("name")
            .eq("id", b.funnel_id)
            .maybeSingle();
          setFunnelName(funnelData?.name || "Funnel Brief");
        }
      }
      setLoading(false);
    })();
  }, [token]);

  const canEdit = brief?.share_permission === "edit";

  const saveValues = useCallback(async () => {
    if (!brief?.id || !canEdit) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("funnel_briefs")
      .update({ values: values as any })
      .eq("id", brief.id);
    if (err) toast.error("Error saving");
    else toast.success("Brief saved");
    setSaving(false);
  }, [brief, values, canEdit]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={logo} alt="Boostmate" className="h-8" />
        <p className="text-muted-foreground">This brief link is invalid or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Boostmate" className="h-5" />
          <div>
            <h1 className="text-sm font-display font-bold text-foreground">{funnelName}</h1>
            <p className="text-[10px] text-muted-foreground">
              {canEdit ? "You can fill in and save this brief" : "Read-only view"}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button size="sm" onClick={saveValues} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </div>

      {/* Brief content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <BriefFiller
          structure={brief.structure}
          values={values}
          onChange={setValues}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
};

export default SharedBrief;
