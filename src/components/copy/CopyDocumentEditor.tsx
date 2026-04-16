import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Settings2, Eye, PenTool, Sparkles, Loader2, GripVertical, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComponentUIRenderer from "./ComponentUIRenderer";
import { executeAIAction } from "@/lib/api/aiActions";

interface DocumentComponent {
  id: string;
  document_id: string;
  component_slug: string;
  sort_order: number;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  is_generated: boolean;
}

interface CopyComponentDef {
  slug: string;
  name: string;
  description: string;
  ai_action_slug: string;
  instructions: string;
  ui_interface_slug: string;
}

interface CopyFramework {
  id: string;
  name: string;
  component_slugs: string[];
  type: string;
}

interface Offer {
  id: string;
  name: string;
  data: any;
}

interface CopyDocumentEditorProps {
  documentId: string;
  documentName: string;
  documentType: string;
  onBack: () => void;
}

const CopyDocumentEditor = ({ documentId, documentName, documentType, onBack }: CopyDocumentEditorProps) => {
  const [docName, setDocName] = useState(documentName);
  const [activeView, setActiveView] = useState<"builder" | "preview" | "settings">("builder");
  const [docComponents, setDocComponents] = useState<DocumentComponent[]>([]);
  const [componentDefs, setComponentDefs] = useState<CopyComponentDef[]>([]);
  const [frameworks, setFrameworks] = useState<CopyFramework[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeComponentIdx, setActiveComponentIdx] = useState(0);
  const [contextType, setContextType] = useState("custom");
  const [contextOfferId, setContextOfferId] = useState<string | null>(null);
  const [contextCustomText, setContextCustomText] = useState("");
  const [globalInstructions, setGlobalInstructions] = useState("");
  const [generatingAll, setGeneratingAll] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const load = useCallback(async () => {
    const [{ data: dc }, { data: cd }, { data: fw }, { data: of }, { data: doc }] = await Promise.all([
      supabase.from("copy_document_components").select("*").eq("document_id", documentId).order("sort_order"),
      supabase.from("copy_components").select("slug, name, description, ai_action_slug, instructions, ui_interface_slug").eq("is_active", true).order("sort_order"),
      supabase.from("copy_frameworks").select("id, name, component_slugs, type").eq("is_active", true).eq("type", documentType),
      supabase.from("offers").select("id, name, data"),
      supabase.from("copy_documents").select("context_type, context_offer_id, context_custom_text, global_instructions, name").eq("id", documentId).single(),
    ]);
    if (dc) setDocComponents(dc as unknown as DocumentComponent[]);
    if (cd) setComponentDefs(cd as unknown as CopyComponentDef[]);
    if (fw) setFrameworks(fw as unknown as CopyFramework[]);
    if (of) setOffers(of as unknown as Offer[]);
    if (doc) {
      setContextType((doc as any).context_type || "custom");
      setContextOfferId((doc as any).context_offer_id || null);
      setContextCustomText((doc as any).context_custom_text || "");
      setGlobalInstructions((doc as any).global_instructions || "");
      setDocName((doc as any).name || documentName);
    }
  }, [documentId, documentType, documentName]);

  useEffect(() => { load(); }, [load]);

  // Build context string
  const getContext = useCallback(() => {
    if (contextType === "offer" && contextOfferId) {
      const offer = offers.find(o => o.id === contextOfferId);
      if (offer) {
        const data = offer.data as Record<string, any>;
        return `Offer: ${offer.name}\n${Object.entries(data).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n")}`;
      }
    }
    return contextCustomText;
  }, [contextType, contextOfferId, contextCustomText, offers]);

  const addComponent = async (slug: string) => {
    const sortOrder = docComponents.length;
    const { data, error } = await supabase
      .from("copy_document_components")
      .insert({ document_id: documentId, component_slug: slug, sort_order: sortOrder } as any)
      .select("*")
      .single();
    if (error) toast.error("Failed to add component");
    else if (data) {
      setDocComponents(prev => [...prev, data as unknown as DocumentComponent]);
      setActiveComponentIdx(docComponents.length);
    }
  };

  const removeComponent = async (id: string) => {
    await supabase.from("copy_document_components").delete().eq("id", id);
    setDocComponents(prev => prev.filter(c => c.id !== id));
    if (activeComponentIdx >= docComponents.length - 1) setActiveComponentIdx(Math.max(0, docComponents.length - 2));
  };

  const updateComponentData = async (id: string, inputs: Record<string, any>, outputs: Record<string, any>, isGenerated: boolean) => {
    await supabase.from("copy_document_components").update({
      inputs: inputs as any,
      outputs: outputs as any,
      is_generated: isGenerated,
    }).eq("id", id);
    setDocComponents(prev => prev.map(c => c.id === id ? { ...c, inputs, outputs, is_generated: isGenerated } : c));
  };

  const applyFramework = async (frameworkId: string) => {
    const fw = frameworks.find(f => f.id === frameworkId);
    if (!fw) return;

    // Delete existing components
    await supabase.from("copy_document_components").delete().eq("document_id", documentId);

    // Insert new ones
    const rows = (fw.component_slugs as string[]).map((slug, i) => ({
      document_id: documentId,
      component_slug: slug,
      sort_order: i,
    }));
    const { data } = await supabase.from("copy_document_components").insert(rows as any).select("*");
    if (data) {
      setDocComponents(data as unknown as DocumentComponent[]);
      setActiveComponentIdx(0);
      toast.success(`Framework "${fw.name}" applied`);
    }
  };

  const saveAsFramework = async () => {
    if (docComponents.length === 0) { toast.error("No components to save"); return; }
    const name = prompt("Framework name:");
    if (!name) return;
    const { error } = await supabase.from("copy_frameworks").insert({
      name,
      type: documentType,
      component_slugs: docComponents.map(c => c.component_slug) as any,
      is_active: true,
    });
    if (error) toast.error("Save failed");
    else toast.success("Framework saved");
  };

  const saveSettings = async () => {
    await supabase.from("copy_documents").update({
      context_type: contextType,
      context_offer_id: contextOfferId,
      context_custom_text: contextCustomText,
      global_instructions: globalInstructions,
      name: docName,
    }).eq("id", documentId);
    toast.success("Settings saved");
  };

  const generateAll = async () => {
    setGeneratingAll(true);
    const context = getContext();
    for (const dc of docComponents) {
      const def = componentDefs.find(d => d.slug === dc.component_slug);
      if (!def || !def.ai_action_slug) continue;
      try {
        const result = await executeAIAction({
          slug: def.ai_action_slug,
          inputs: { ...dc.inputs, context },
          extraInstructions: [globalInstructions, def.instructions].filter(Boolean).join("\n\n"),
        });
        await updateComponentData(dc.id, dc.inputs, result.output, true);
      } catch (e: any) {
        toast.error(`Failed: ${def.name} — ${e.message}`);
      }
    }
    setGeneratingAll(false);
    toast.success("All components generated");
  };

  const activeComp = docComponents[activeComponentIdx];
  const activeDef = activeComp ? componentDefs.find(d => d.slug === activeComp.component_slug) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {editingName ? (
          <Input
            autoFocus
            value={docName}
            onChange={e => setDocName(e.target.value)}
            onBlur={() => { setEditingName(false); saveSettings(); }}
            onKeyDown={e => e.key === "Enter" && (setEditingName(false), saveSettings())}
            className="text-lg font-display font-bold h-auto py-1 max-w-sm"
          />
        ) : (
          <h2
            className="text-lg font-display font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
            onClick={() => setEditingName(true)}
          >
            {docName}
          </h2>
        )}
        <div className="flex-1" />
        <Tabs value={activeView} onValueChange={v => setActiveView(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="builder" className="text-xs gap-1.5 px-3 h-7"><PenTool className="w-3.5 h-3.5" /> Builder</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1.5 px-3 h-7"><Eye className="w-3.5 h-3.5" /> Preview</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1.5 px-3 h-7"><Settings2 className="w-3.5 h-3.5" /> Settings</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === "builder" && (
          <div className="flex h-full">
            {/* Left sidebar: component list */}
            <div className="w-56 border-r border-border bg-card overflow-y-auto shrink-0">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Components</span>
                </div>
                {/* Add component */}
                <Select onValueChange={addComponent}>
                  <SelectTrigger className="text-xs h-7"><SelectValue placeholder="Add component..." /></SelectTrigger>
                  <SelectContent>
                    {componentDefs.map(cd => (
                      <SelectItem key={cd.slug} value={cd.slug} className="text-xs">{cd.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Framework apply */}
              {frameworks.length > 0 && docComponents.length === 0 && (
                <div className="p-3 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">Or use a framework:</span>
                  <Select onValueChange={applyFramework}>
                    <SelectTrigger className="text-xs h-7 mt-1"><SelectValue placeholder="Select framework..." /></SelectTrigger>
                    <SelectContent>
                      {frameworks.map(fw => (
                        <SelectItem key={fw.id} value={fw.id} className="text-xs">{fw.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Component list */}
              <div className="p-1">
                {docComponents.map((dc, idx) => {
                  const def = componentDefs.find(d => d.slug === dc.component_slug);
                  return (
                    <div
                      key={dc.id}
                      onClick={() => setActiveComponentIdx(idx)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-xs transition-colors ${
                        idx === activeComponentIdx
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{def?.name || dc.component_slug}</span>
                      {dc.is_generated && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={e => { e.stopPropagation(); removeComponent(dc.id); }}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom actions */}
              {docComponents.length > 0 && (
                <div className="p-3 border-t border-border space-y-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full text-xs h-8 gap-1.5"
                    onClick={generateAll}
                    disabled={generatingAll}
                  >
                    {generatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {generatingAll ? "Generating..." : "Generate All"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7 gap-1.5"
                    onClick={saveAsFramework}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    Save as Framework
                  </Button>
                </div>
              )}
            </div>

            {/* Main: active component UI */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeComp && activeDef ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-display font-bold text-foreground">{activeDef.name}</h3>
                    {activeDef.description && (
                      <p className="text-sm text-muted-foreground mt-1">{activeDef.description}</p>
                    )}
                  </div>
                  <ComponentUIRenderer
                    uiInterfaceSlug={activeDef.ui_interface_slug}
                    componentSlug={activeDef.slug}
                    aiActionSlug={activeDef.ai_action_slug}
                    componentInstructions={[globalInstructions, activeDef.instructions].filter(Boolean).join("\n\n")}
                    context={getContext()}
                    inputs={activeComp.inputs as Record<string, any>}
                    outputs={activeComp.outputs as Record<string, any>}
                    onInputsChange={inputs => updateComponentData(activeComp.id, inputs, activeComp.outputs as Record<string, any>, activeComp.is_generated)}
                    onOutputsChange={outputs => updateComponentData(activeComp.id, activeComp.inputs as Record<string, any>, outputs, true)}
                    onGenerated={() => {}}
                  />
                </div>
              ) : docComponents.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-display font-bold text-foreground mb-2">No components yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add components manually or apply a framework to get started.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Select a component from the sidebar
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === "preview" && (
          <div className="overflow-y-auto p-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-display font-bold text-foreground mb-8">{docName}</h2>
            {docComponents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No components added yet.</p>
            ) : (
              <div className="space-y-8">
                {docComponents.map(dc => {
                  const def = componentDefs.find(d => d.slug === dc.component_slug);
                  const outputs = dc.outputs as Record<string, any>;
                  const outputKeys = Object.keys(outputs).filter(k => outputs[k]);
                  if (outputKeys.length === 0) return (
                    <div key={dc.id} className="p-6 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground">
                      {def?.name || dc.component_slug} — not generated yet
                    </div>
                  );
                  return (
                    <div key={dc.id} className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{def?.name}</p>
                      {outputKeys.map(key => (
                        <div key={key}>
                          {Array.isArray(outputs[key]) ? (
                            <ul className="list-disc list-inside space-y-1">
                              {(outputs[key] as string[]).map((item, i) => (
                                <li key={i} className="text-sm text-foreground">{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-foreground whitespace-pre-wrap">{outputs[key]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === "settings" && (
          <div className="overflow-y-auto p-6 max-w-2xl">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Document Name</Label>
                <Input value={docName} onChange={e => setDocName(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Context Source</Label>
                <Select value={contextType} onValueChange={setContextType}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Text</SelectItem>
                    <SelectItem value="offer">Linked Offer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contextType === "offer" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Select Offer</Label>
                  <Select value={contextOfferId || ""} onValueChange={setContextOfferId}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select an offer..." /></SelectTrigger>
                    <SelectContent>
                      {offers.map(o => <SelectItem key={o.id} value={o.id} className="text-sm">{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Custom Context</Label>
                  <Textarea
                    value={contextCustomText}
                    onChange={e => setContextCustomText(e.target.value)}
                    placeholder="Describe your offer, target audience, product, etc."
                    className="min-h-[120px] text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Global Instructions</Label>
                <p className="text-xs text-muted-foreground">Tone, style, and guidelines applied to all components</p>
                <Textarea
                  value={globalInstructions}
                  onChange={e => setGlobalInstructions(e.target.value)}
                  placeholder="e.g. Write in a bold, direct tone. Focus on benefits over features..."
                  className="min-h-[120px] text-sm"
                />
              </div>

              {/* Framework actions */}
              {frameworks.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Apply Framework</Label>
                  <Select onValueChange={applyFramework}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Replace components with framework..." /></SelectTrigger>
                    <SelectContent>
                      {frameworks.map(fw => (
                        <SelectItem key={fw.id} value={fw.id} className="text-sm">{fw.name} ({fw.component_slugs.length} components)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={saveSettings}>Save Settings</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CopyDocumentEditor;
