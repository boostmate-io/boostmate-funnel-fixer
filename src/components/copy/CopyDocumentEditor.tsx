import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Settings2, Eye, PenTool, Sparkles, Loader2,
  ChevronUp, ChevronDown, LayoutList, icons, Gem, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ComponentUIRenderer from "./ComponentUIRenderer";
import { executeAIAction } from "@/lib/api/aiActions";
import { buildScopedBlueprintContext, getMissingBlueprintFields } from "@/lib/blueprintFields";

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const IconComp = (icons as any)[name];
  if (!IconComp) return <Gem className={className} />;
  return <IconComp className={className} />;
}

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
  icon: string;
  output_structure: Array<{ key: string; label: string; type: string; item_schema?: any[] }>;
  required_blueprint_fields: string[];
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
  const { activeSubAccountId } = useWorkspace();
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
  const [blueprint, setBlueprint] = useState<any>(null);

  const load = useCallback(async () => {
    const offersQuery = activeSubAccountId
      ? supabase.from("offers").select("id, name, data").eq("sub_account_id", activeSubAccountId)
      : supabase.from("offers").select("id, name, data");

    const blueprintQuery = activeSubAccountId
      ? supabase.from("business_blueprints").select("*").eq("sub_account_id", activeSubAccountId).maybeSingle()
      : Promise.resolve({ data: null });

    const [{ data: dc }, { data: cd }, { data: fw }, { data: of }, { data: doc }, { data: bp }] = await Promise.all([
      supabase.from("copy_document_components").select("*").eq("document_id", documentId).order("sort_order"),
      supabase.from("copy_components").select("slug, name, description, ai_action_slug, instructions, ui_interface_slug, icon, output_structure, required_blueprint_fields").eq("is_active", true).order("sort_order"),
      supabase.from("copy_frameworks").select("id, name, component_slugs, type").eq("is_active", true).eq("type", documentType),
      offersQuery,
      supabase.from("copy_documents").select("context_type, context_offer_id, context_custom_text, global_instructions, name").eq("id", documentId).single(),
      blueprintQuery,
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
    setBlueprint(bp || null);
  }, [documentId, documentType, documentName, activeSubAccountId]);

  useEffect(() => { load(); }, [load]);

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

  /**
   * Builds the full context for a specific component:
   *  - the document-level context source (offer or custom text)
   *  - PLUS, when the component declares `required_blueprint_fields`, only
   *    those blueprint sections are appended (scoped context — no full-blueprint dump).
   *  - Fallback: if the component has no required fields, the document context is used as-is.
   */
  const getContextForComponent = useCallback(
    (def?: CopyComponentDef | null) => {
      const base = getContext();
      const required = def?.required_blueprint_fields || [];
      if (required.length === 0) return base;
      const scoped = buildScopedBlueprintContext(blueprint, required);
      if (!scoped) return base;
      return base ? `${base}\n\n${scoped}` : scoped;
    },
    [getContext, blueprint],
  );

  const addComponent = async (slug: string) => {
    const sortOrder = docComponents.length;
    const { data, error } = await supabase
      .from("copy_document_components")
      .insert({ document_id: documentId, component_slug: slug, sort_order: sortOrder } as any)
      .select("*")
      .single();
    if (error) toast.error("Failed to add component");
    else if (data) setDocComponents(prev => [...prev, data as unknown as DocumentComponent]);
  };

  const removeComponent = async (id: string) => {
    await supabase.from("copy_document_components").delete().eq("id", id);
    setDocComponents(prev => prev.filter(c => c.id !== id));
    if (activeComponentIdx >= docComponents.length - 1) setActiveComponentIdx(Math.max(0, docComponents.length - 2));
  };

  const moveComponent = async (idx: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= docComponents.length) return;
    const updated = [...docComponents];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((c, i) => c.sort_order = i);
    setDocComponents(updated);
    await Promise.all(updated.map(c =>
      supabase.from("copy_document_components").update({ sort_order: c.sort_order }).eq("id", c.id)
    ));
  };

  const updateComponentData = (id: string, inputs: Record<string, any>, outputs: Record<string, any>, isGenerated: boolean) => {
    // Update local state immediately so controlled inputs stay in sync while typing.
    setDocComponents(prev => prev.map(c => c.id === id ? { ...c, inputs, outputs, is_generated: isGenerated } : c));
    // Persist to DB. The Supabase query builder is a PromiseLike — it only
    // executes when .then()/await is called, so we MUST attach .then() here
    // (a bare `void supabase...update()` never sends the request).
    supabase
      .from("copy_document_components")
      .update({
        inputs: inputs as any,
        outputs: outputs as any,
        is_generated: isGenerated,
      })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to save component data:", error);
          toast.error("Failed to save changes");
        }
      });
  };

  const applyFramework = async (frameworkId: string) => {
    const fw = frameworks.find(f => f.id === frameworkId);
    if (!fw) return;
    await supabase.from("copy_document_components").delete().eq("document_id", documentId);
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
    else { toast.success("Framework saved"); load(); }
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
    for (const dc of docComponents) {
      const def = componentDefs.find(d => d.slug === dc.component_slug);
      if (!def || !def.ai_action_slug) continue;
      try {
        const context = getContextForComponent(def);
        const result = await executeAIAction({
          slug: def.ai_action_slug,
          inputs: { ...dc.inputs, context },
          extraInstructions: [globalInstructions, def.instructions].filter(Boolean).join("\n\n"),
          outputStructure: def.output_structure,
        });
        await updateComponentData(dc.id, dc.inputs as Record<string, any>, result.output, true);
      } catch (e: any) {
        toast.error(`Failed: ${def.name} — ${e.message}`);
      }
    }
    setGeneratingAll(false);
    toast.success("All components generated");
  };

  const getIconForComponent = (slug: string) => {
    const def = componentDefs.find(d => d.slug === slug);
    return def?.icon || "Gem";
  };

  const activeComp = docComponents[activeComponentIdx];
  const activeDef = activeComp ? componentDefs.find(d => d.slug === activeComp.component_slug) : null;

  const missingBlueprintFields = useMemo(
    () => getMissingBlueprintFields(blueprint, activeDef?.required_blueprint_fields),
    [blueprint, activeDef?.required_blueprint_fields],
  );

  const openBlueprintModule = () => {
    window.dispatchEvent(new CustomEvent("boostmate:navigate-module", { detail: "business-blueprint" }));
  };

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
        {/* ═══ BUILDER ═══ */}
        {activeView === "builder" && (
          <div className="flex h-full">
            {/* Sidebar navigation */}
            <div className="w-64 border-r border-border bg-card shrink-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-1">
                  {docComponents.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <PenTool className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground mb-2">No components yet</p>
                      <p className="text-[10px] text-muted-foreground">Go to Settings to add components or apply a framework.</p>
                    </div>
                  ) : (
                    docComponents.map((dc, idx) => {
                      const def = componentDefs.find(d => d.slug === dc.component_slug);
                      const iconName = getIconForComponent(dc.component_slug);
                      const isActive = idx === activeComponentIdx;
                      return (
                        <button
                          key={dc.id}
                          onClick={() => setActiveComponentIdx(idx)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "hover:bg-muted/50 text-foreground"
                          }`}
                        >
                          <LucideIcon name={iconName} className="w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{def?.name || dc.component_slug}</p>
                            {def?.description && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{def.description}</p>
                            )}
                          </div>
                          {dc.is_generated && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {docComponents.length > 0 && (
                  <div className="p-3 border-t border-border">
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
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Active component */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeComp && activeDef ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <LucideIcon name={getIconForComponent(activeComp.component_slug)} className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-bold text-foreground">{activeDef.name}</h3>
                      {activeDef.description && (
                        <p className="text-xs text-muted-foreground">{activeDef.description}</p>
                      )}
                    </div>
                  </div>
                  {missingBlueprintFields.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-foreground">
                          This component may not generate optimal copy because your Business Blueprint is missing:
                        </p>
                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                          {missingBlueprintFields.map((f) => (
                            <li key={f.slug}>{f.label}</li>
                          ))}
                        </ul>
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={openBlueprintModule}>
                          Complete Blueprint
                        </Button>
                      </div>
                    </div>
                  )}
                  <ComponentUIRenderer
                    uiInterfaceSlug={activeDef.ui_interface_slug}
                    componentSlug={activeDef.slug}
                    aiActionSlug={activeDef.ai_action_slug}
                    componentInstructions={[globalInstructions, activeDef.instructions].filter(Boolean).join("\n\n")}
                    context={getContextForComponent(activeDef)}
                    inputs={activeComp.inputs as Record<string, any>}
                    outputs={activeComp.outputs as Record<string, any>}
                    outputStructure={activeDef.output_structure}
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
                      Go to Settings to add components or apply a framework.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setActiveView("settings")}>
                      <Settings2 className="w-4 h-4 mr-1.5" /> Open Settings
                    </Button>
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

        {/* ═══ PREVIEW ═══ */}
        {activeView === "preview" && (
          <div className="h-full overflow-y-auto bg-muted/30">
            <div className="p-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">{docName}</h2>
            {docComponents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No components added yet.</p>
            ) : (
              <div className="space-y-6">
                {docComponents.map(dc => {
                  const def = componentDefs.find(d => d.slug === dc.component_slug);
                  const outputs = (dc.outputs || {}) as Record<string, any>;
                  const structureKeys = (def?.output_structure || []).map(o => o.key);
                  const labelMap = new Map((def?.output_structure || []).map(o => [o.key, o.label]));
                  const rawKeys = Object.keys(outputs).filter(k => {
                    const v = outputs[k];
                    return Array.isArray(v) ? v.length > 0 : !!v;
                  });
                  const outputKeys = [
                    ...structureKeys.filter(k => rawKeys.includes(k)),
                    ...rawKeys.filter(k => !structureKeys.includes(k)),
                  ];
                  const title = def?.name || dc.component_slug;
                  if (outputKeys.length === 0) return (
                    <div key={dc.id} className="p-6 border border-dashed border-border rounded-lg bg-background text-center text-sm text-muted-foreground">
                      <p className="text-xs uppercase tracking-wider font-semibold text-foreground/70 mb-1">{title}</p>
                      Not generated yet
                    </div>
                  );
                  return (
                    <section key={dc.id} className="rounded-lg border border-border bg-background shadow-sm overflow-hidden">
                      <header className="px-5 py-3 border-b border-border bg-muted/40">
                        <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wider">{title}</h3>
                      </header>
                      <div className="p-5 space-y-4">
                        {outputKeys.map(key => {
                          const label = labelMap.get(key) || key.replace(/_/g, " ");
                          const value = outputs[key];
                          return (
                            <div key={key} className="space-y-1">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                {label}
                              </p>
                              {Array.isArray(value) ? (
                                <ul className="list-disc list-inside space-y-1 pl-1">
                                  {(value as any[]).map((item, i) => (
                                    <li key={i} className="text-sm text-foreground whitespace-pre-wrap">
                                      {typeof item === "string" ? item : JSON.stringify(item)}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {activeView === "settings" && (
          <ScrollArea className="h-full">
            <div className="p-6 max-w-2xl space-y-8">
              {/* Document name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Document Name</Label>
                <Input value={docName} onChange={e => setDocName(e.target.value)} />
              </div>

              {/* Context source */}
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

              {/* ── Component Management ── */}
              <div className="border-t border-border pt-6 space-y-4">
                <div>
                  <h3 className="text-sm font-display font-bold text-foreground">Components</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Add, remove, and reorder document components.</p>
                </div>

                {/* Apply framework */}
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

                {/* Add component */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Add Component</Label>
                  <Select onValueChange={addComponent}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Select a component to add..." /></SelectTrigger>
                    <SelectContent>
                      {componentDefs.map(cd => (
                        <SelectItem key={cd.slug} value={cd.slug} className="text-sm">
                          {cd.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Component list */}
                <div className="space-y-1">
                  {docComponents.map((dc, idx) => {
                    const def = componentDefs.find(d => d.slug === dc.component_slug);
                    const iconName = getIconForComponent(dc.component_slug);
                    return (
                      <div
                        key={dc.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <LucideIcon name={iconName} className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{def?.name || dc.component_slug}</p>
                          {def?.description && (
                            <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveComponent(idx, "up")}>
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === docComponents.length - 1} onClick={() => moveComponent(idx, "down")}>
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeComponent(dc.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save as framework */}
                {docComponents.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={saveAsFramework}>
                    <LayoutList className="w-3.5 h-3.5" />
                    Save as Framework
                  </Button>
                )}
              </div>

              {/* Save button at the bottom */}
              <div className="border-t border-border pt-6">
                <Button onClick={saveSettings}>Save Settings</Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default CopyDocumentEditor;
