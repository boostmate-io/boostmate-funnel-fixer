import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Save, CheckCircle2, Circle, Gem, Star, AlertTriangle,
  Lightbulb, Package, TrendingUp, Award, DollarSign, Shield, HelpCircle,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  OFFER_SECTIONS, OfferSection, OfferField, OfferData, OfferStatus,
  computeOfferCompletion, STATUS_LABELS, STATUS_COLORS,
} from "./offerFramework";
import OfferShareDialog from "./OfferShareDialog";

const ICON_MAP: Record<string, React.ElementType> = {
  Gem, Star, AlertTriangle, Lightbulb, Package, TrendingUp, Award, DollarSign, Shield, HelpCircle,
};

interface OfferEditorProps {
  offerId: string;
  onBack: () => void;
  readOnly?: boolean;
}

const OfferEditor = ({ offerId, onBack, readOnly }: OfferEditorProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<OfferStatus>("draft");
  const [data, setData] = useState<OfferData>({});
  const [activeSection, setActiveSection] = useState(OFFER_SECTIONS[0].id);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const isDirty = useRef(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: row } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .single();
      if (row) {
        const r = row as any;
        setName(r.name);
        setStatus(r.status as OfferStatus);
        setData(r.data || {});
        setShareToken(r.share_token || null);
      }
      setLoading(false);
    })();
  }, [offerId]);

  const completion = computeOfferCompletion(data);

  const saveOffer = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase
      .from("offers")
      .update({
        name,
        status,
        data: data as any,
        completion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);
    if (error) toast.error("Error saving offer");
    else { toast.success("Offer saved"); isDirty.current = false; }
    setSaving(false);
  }, [offerId, name, status, data, completion]);

  const updateField = useCallback((fieldId: string, value: string) => {
    setData((prev) => ({ ...prev, [fieldId]: value }));
    isDirty.current = true;
  }, []);

  const sectionCompletion = useCallback((section: OfferSection): number => {
    const fields = [
      ...section.fields,
      ...(section.subSections?.flatMap((ss) => ss.fields) ?? []),
    ];
    if (fields.length === 0) return 0;
    const filled = fields.filter((f) => {
      const v = data[f.id];
      return v !== null && v !== undefined && (typeof v === "string" ? v.trim().length > 0 : true);
    }).length;
    return Math.round((filled / fields.length) * 100);
  }, [data]);

  const isLocked = status === "approved" && !readOnly;

  const renderField = (field: OfferField) => {
    const value = (data[field.id] as string) || "";

    if (readOnly || isLocked) {
      if (!value.trim()) return null;
      return (
        <div key={field.id} className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
          <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{field.label}</label>
        {field.type === "select" ? (
          <Select value={value} onValueChange={(v) => updateField(field.id, v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === "textarea" ? (
          <Textarea
            value={value}
            onChange={(e) => updateField(field.id, e.target.value)}
            className="min-h-[80px] text-sm resize-y"
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => updateField(field.id, e.target.value)}
            className="h-9 text-sm"
          />
        )}
        {field.placeholder && (
          <p className="text-[10px] text-muted-foreground leading-relaxed">{field.placeholder}</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const currentSection = OFFER_SECTIONS.find((s) => s.id === activeSection) || OFFER_SECTIONS[0];
  const SectionIcon = ICON_MAP[currentSection.icon] || Gem;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          {readOnly ? (
            <h2 className="text-sm font-display font-bold text-foreground truncate">{name}</h2>
          ) : (
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); isDirty.current = true; }}
              className="h-8 text-sm font-display font-bold border-transparent hover:border-input focus:border-input w-64"
            />
          )}
          <Badge variant="secondary" className={`text-[10px] shrink-0 ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {!readOnly && (
            <>
              <Select value={status} onValueChange={(v) => { setStatus(v as OfferStatus); isDirty.current = true; }}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowShareDialog(true)}>
                <Share2 className="w-3.5 h-3.5" /> Share
              </Button>
              <Button size="sm" onClick={saveOffer} disabled={saving} className="h-8 gap-1.5">
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-foreground">Overall Completion</span>
          <span className="text-xs font-bold text-primary">{completion}%</span>
        </div>
        <Progress value={completion} className="h-2" />
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Section nav sidebar */}
        <div className="w-64 border-r border-border bg-card shrink-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {OFFER_SECTIONS.map((section) => {
                const sc = sectionCompletion(section);
                const Icon = ICON_MAP[section.icon] || Gem;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{section.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Progress value={sc} className="h-1 flex-1" />
                        <span className="text-[9px] text-muted-foreground w-7 text-right">{sc}%</span>
                      </div>
                    </div>
                    {sc === 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <SectionIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">{currentSection.title}</h2>
                <p className="text-xs text-muted-foreground">{currentSection.description}</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {currentSection.fields.map(renderField)}

              {currentSection.subSections?.map((sub) => (
                <div key={sub.id} className="mt-8">
                  <h3 className="text-sm font-display font-bold text-foreground mb-4 pb-2 border-b border-border">
                    {sub.title}
                  </h3>
                  <div className="space-y-5">
                    {sub.fields.map(renderField)}
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation between sections */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
              {(() => {
                const idx = OFFER_SECTIONS.findIndex((s) => s.id === activeSection);
                return (
                  <>
                    <Button
                      variant="outline" size="sm"
                      disabled={idx === 0}
                      onClick={() => setActiveSection(OFFER_SECTIONS[idx - 1]?.id)}
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={idx === OFFER_SECTIONS.length - 1}
                      onClick={() => setActiveSection(OFFER_SECTIONS[idx + 1]?.id)}
                    >
                      Next →
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
        <OfferShareDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          offerId={offerId}
          offerName={name}
          shareToken={shareToken}
          onShareTokenChange={setShareToken}
        />
      )}
    </div>
  );
};

export default OfferEditor;
