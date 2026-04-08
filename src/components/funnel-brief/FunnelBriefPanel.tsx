import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  X, Save, Share2, Link2, Copy, Settings2, FileEdit, Eye,
  ClipboardList, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BriefBuilder from "./BriefBuilder";
import BriefFiller from "./BriefFiller";
import { BriefStructure, BriefValues, FunnelBrief } from "./types";

interface FunnelBriefPanelProps {
  funnelId: string | null;
  userId: string | null;
  funnelName: string;
  readOnly?: boolean;
  isSeedTemplate?: boolean;
  onClose: () => void;
}

const FunnelBriefPanel = ({ funnelId, userId, funnelName, readOnly, isSeedTemplate, onClose }: FunnelBriefPanelProps) => {
  const { t } = useTranslation();
  const [brief, setBrief] = useState<FunnelBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [structure, setStructure] = useState<BriefStructure>({ sections: [] });
  const [values, setValues] = useState<BriefValues>({});
  const [activeTab, setActiveTab] = useState<string>("fill");
  const isDirty = useRef(false);

  // Load brief for current funnel or seed template
  useEffect(() => {
    if (!funnelId) { setLoading(false); return; }

    (async () => {
      setLoading(true);

      if (isSeedTemplate) {
        // Load brief_structure from seed_templates
        const { data, error } = await supabase
          .from("seed_templates")
          .select("brief_structure")
          .eq("id", funnelId)
          .maybeSingle();

        if (data) {
          const s = (data.brief_structure as any) || { sections: [] };
          setStructure(s);
          setBrief({ id: funnelId, funnel_id: funnelId, user_id: userId || "", structure: s, values: {}, share_token: null, share_permission: "view", created_at: "", updated_at: "" } as FunnelBrief);
        } else {
          setBrief(null);
          setStructure({ sections: [] });
        }
        setValues({});
      } else {
        const { data, error } = await supabase
          .from("funnel_briefs")
          .select("*")
          .eq("funnel_id", funnelId)
          .maybeSingle();

        if (data) {
          const b = data as unknown as FunnelBrief;
          setBrief(b);
          setStructure(b.structure || { sections: [] });
          setValues(b.values || {});
        } else {
          setBrief(null);
          setStructure({ sections: [] });
          setValues({});
        }
      }
      setLoading(false);
      isDirty.current = false;
    })();
  }, [funnelId, isSeedTemplate]);

  const saveBrief = useCallback(async () => {
    if (!funnelId || !userId) return;
    setSaving(true);

    if (isSeedTemplate) {
      // Save brief_structure directly to seed_templates
      const { error } = await supabase
        .from("seed_templates")
        .update({ brief_structure: structure as any, updated_at: new Date().toISOString() })
        .eq("id", funnelId);
      if (error) toast.error("Error saving brief");
      else {
        toast.success("Brief saved");
        isDirty.current = false;
      }
    } else {
      const payload = {
        structure: structure as any,
        values: values as any,
        updated_at: new Date().toISOString(),
      };

      if (brief?.id) {
        const { error } = await supabase
          .from("funnel_briefs")
          .update(payload)
          .eq("id", brief.id);
        if (error) toast.error("Error saving brief");
        else {
          toast.success("Brief saved");
          isDirty.current = false;
        }
      } else {
        const { data, error } = await supabase
          .from("funnel_briefs")
          .insert({
            funnel_id: funnelId,
            user_id: userId,
            structure: structure as any,
            values: values as any,
          })
          .select()
          .single();
        if (error) toast.error("Error creating brief");
        else {
          setBrief(data as unknown as FunnelBrief);
          toast.success("Brief created");
          isDirty.current = false;
        }
      }
    }
    setSaving(false);
  }, [funnelId, userId, brief, structure, values, isSeedTemplate]);

  const handleStructureChange = useCallback((newStructure: BriefStructure) => {
    setStructure(newStructure);
    isDirty.current = true;
  }, []);

  const handleValuesChange = useCallback((newValues: BriefValues) => {
    setValues(newValues);
    isDirty.current = true;
  }, []);

  // Share link
  const generateShareLink = useCallback(async () => {
    if (!brief?.id) {
      toast.error("Save the brief first");
      return;
    }
    let token = brief.share_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const { error } = await supabase
        .from("funnel_briefs")
        .update({ share_token: token } as any)
        .eq("id", brief.id);
      if (error) { toast.error("Error creating share link"); return; }
      setBrief({ ...brief, share_token: token });
    }
    const url = `${window.location.origin}/brief/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard");
  }, [brief]);

  const updateSharePermission = useCallback(async (permission: "view" | "edit") => {
    if (!brief?.id) return;
    const { error } = await supabase
      .from("funnel_briefs")
      .update({ share_permission: permission } as any)
      .eq("id", brief.id);
    if (error) toast.error("Error updating permission");
    else {
      setBrief({ ...brief, share_permission: permission });
      toast.success(`Share permission set to ${permission}`);
    }
  }, [brief]);

  const removeShareLink = useCallback(async () => {
    if (!brief?.id) return;
    const { error } = await supabase
      .from("funnel_briefs")
      .update({ share_token: null } as any)
      .eq("id", brief.id);
    if (error) toast.error("Error removing share link");
    else {
      setBrief({ ...brief, share_token: null });
      toast.success("Share link removed");
    }
  }, [brief]);

  if (!funnelId) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-display font-bold text-foreground">Funnel Brief</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">Save your funnel first to attach a brief.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-sm font-display font-bold text-foreground truncate">Funnel Brief</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!readOnly && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={saveBrief} disabled={saving}>
              <Save className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className={`mx-4 mt-3 shrink-0 ${readOnly ? "grid-cols-1" : isSeedTemplate ? "grid-cols-2" : "grid-cols-3"} grid`}>
              <TabsTrigger value="fill" className="text-xs">
                <FileEdit className="w-3 h-3 mr-1" /> Fill
              </TabsTrigger>
              {!readOnly && (
                <>
                  <TabsTrigger value="builder" className="text-xs">
                    <Settings2 className="w-3 h-3 mr-1" /> Builder
                  </TabsTrigger>
                  {!isSeedTemplate && (
                    <TabsTrigger value="share" className="text-xs">
                      <Share2 className="w-3 h-3 mr-1" /> Share
                    </TabsTrigger>
                  )}
                </>
              )}
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="fill" className="px-4 pb-4 mt-0">
                <BriefFiller
                  structure={structure}
                  values={values}
                  onChange={handleValuesChange}
                  readOnly={readOnly}
                />
              </TabsContent>

              {!readOnly && (
                <>
                  <TabsContent value="builder" className="px-4 pb-4 mt-0">
                    <BriefBuilder
                      structure={structure}
                      onChange={handleStructureChange}
                    />
                  </TabsContent>

                  <TabsContent value="share" className="px-4 pb-4 mt-0">
                    <div className="space-y-4 pt-2">
                      {/* Share link */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-foreground">Share Link</h4>
                        <p className="text-[10px] text-muted-foreground">
                          Generate a link to let clients or stakeholders view or fill in this brief.
                        </p>

                        {brief?.share_token ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border">
                              <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="text-[10px] text-foreground truncate flex-1 font-mono">
                                {window.location.origin}/brief/{brief.share_token}
                              </span>
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/brief/${brief.share_token}`);
                                  toast.success("Link copied");
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <Button variant="destructive" size="sm" className="h-7 text-xs w-full" onClick={removeShareLink}>
                              Remove Share Link
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full" onClick={generateShareLink}>
                            <Share2 className="w-3 h-3 mr-1" /> Generate Share Link
                          </Button>
                        )}
                      </div>

                      {/* Permissions */}
                      {brief?.share_token && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-foreground">Permissions</h4>
                          <Select
                            value={brief?.share_permission || "view"}
                            onValueChange={(v) => updateSharePermission(v as "view" | "edit")}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view" className="text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Eye className="w-3 h-3" /> View Only
                                </div>
                              </SelectItem>
                              <SelectItem value="edit" className="text-xs">
                                <div className="flex items-center gap-1.5">
                                  <FileEdit className="w-3 h-3" /> Can Edit
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-muted-foreground">
                            {brief?.share_permission === "edit"
                              ? "Anyone with the link can view and edit the brief values."
                              : "Anyone with the link can only view the brief."
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default FunnelBriefPanel;
