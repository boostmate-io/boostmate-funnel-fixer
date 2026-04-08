import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Mail, Megaphone, Share2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssetSectionsList from "./AssetSectionsList";

interface Asset {
  id: string;
  user_id: string;
  type: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const ASSET_TYPES = [
  { type: "sales_copy", icon: FileText, labelKey: "assets.types.salesCopy" },
  { type: "email_sequence", icon: Mail, labelKey: "assets.types.emailSequence" },
  { type: "ad_creative", icon: Megaphone, labelKey: "assets.types.adCreative" },
  { type: "social_media", icon: Share2, labelKey: "assets.types.socialMedia" },
];

const AssetsLibrary = () => {
  const { t } = useTranslation();
  const { activeSubAccountId } = useWorkspace();
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeType, setActiveType] = useState("sales_copy");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingName, setEditingName] = useState(false);

  const loadAssets = useCallback(async () => {
    if (!user || !activeSubAccountId) return;
    const { data } = await supabase
      .from("assets")
      .select("*")
      .eq("sub_account_id", activeSubAccountId)
      .order("updated_at", { ascending: false });
    if (data) setAssets(data as Asset[]);
  }, [user, activeSubAccountId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const createAsset = async () => {
    if (!user || !activeSubAccountId) return;
    const { data, error } = await supabase
      .from("assets")
      .insert({ user_id: user.id, type: activeType, name: t("assets.untitled"), sub_account_id: activeSubAccountId })
      .select()
      .single();
    if (error) toast.error(t("assets.saveError"));
    else {
      const asset = data as Asset;
      setAssets((prev) => [asset, ...prev]);
      setSelectedAsset(asset);
    }
  };

  const deleteAsset = async (id: string) => {
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) toast.error(t("assets.deleteError"));
    else {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      if (selectedAsset?.id === id) setSelectedAsset(null);
      toast.success(t("assets.deleted"));
    }
  };

  const updateAssetName = async (id: string, name: string) => {
    await supabase.from("assets").update({ name }).eq("id", id);
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
    if (selectedAsset?.id === id) setSelectedAsset((prev) => prev ? { ...prev, name } : null);
    setEditingName(false);
  };

  const filteredAssets = assets.filter((a) => a.type === activeType);

  // Detail view
  if (selectedAsset) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          {editingName ? (
            <Input
              autoFocus
              defaultValue={selectedAsset.name}
              onBlur={(e) => updateAssetName(selectedAsset.id, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateAssetName(selectedAsset.id, (e.target as HTMLInputElement).value)}
              className="text-lg font-display font-bold h-auto py-1 max-w-sm"
            />
          ) : (
            <h2
              className="text-lg font-display font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => setEditingName(true)}
            >
              {selectedAsset.name}
            </h2>
          )}
        </div>
        <div className="flex-1 overflow-auto p-6">
          <AssetSectionsList assetId={selectedAsset.id} />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{t("assets.title")}</h1>
        <Button onClick={createAsset} size="sm">
          <Plus className="w-4 h-4 mr-1" /> {t("assets.create")}
        </Button>
      </div>

      <Tabs value={activeType} onValueChange={setActiveType} className="flex-1 flex flex-col">
        <TabsList className="mb-4 w-fit">
          {ASSET_TYPES.map((at) => (
            <TabsTrigger key={at.type} value={at.type} className="gap-2">
              <at.icon className="w-4 h-4" />
              {t(at.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        {ASSET_TYPES.map((at) => (
          <TabsContent key={at.type} value={at.type} className="flex-1">
            {filteredAssets.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <at.icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-display font-bold text-foreground mb-2">{t("assets.empty")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("assets.emptyDescription")}</p>
                <Button onClick={createAsset} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> {t("assets.create")}
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg border border-border hover:shadow-card-hover transition-shadow cursor-pointer"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(asset.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AssetsLibrary;
