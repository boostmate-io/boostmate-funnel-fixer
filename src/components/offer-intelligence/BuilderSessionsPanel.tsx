// Offer Design: resume unfinished Builder sessions, review completed ones,
// start fresh, or open the finished offer. Never creates offers.
import { useEffect, useState } from "react";
import { ChevronDown, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUILDER_STAGES } from "@shared/offerIntelligence/builderSession";
import { ECOSYSTEM_TIERS } from "@/components/business-blueprint/offerDesignTypes";
import { listBuilderSessions, type BuilderSession } from "@/lib/offers/offerBuilder";

interface Props {
  subAccountId: string | null;
  offers: { id: string; name: string }[];
  busy: boolean;
  onOpenSession: (id: string) => void;
  onStartNew: (s: BuilderSession) => void;
  onOpenOffer: (offerId: string) => void;
}

export default function BuilderSessionsPanel({ subAccountId, offers, busy, onOpenSession, onStartNew, onOpenOffer }: Props) {
  const [sessions, setSessions] = useState<BuilderSession[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (subAccountId) listBuilderSessions(subAccountId).then(setSessions).catch(() => setSessions([])); }, [subAccountId]);
  if (!sessions?.length) return null;
  const active = sessions.filter((s) => s.status === "active");
  const name = (s: BuilderSession) => {
    const id = s.result_offer_id ?? s.offer_id;
    const o = id ? offers.find((x) => x.id === id) : null;
    return o?.name || (s.intake?.idea ? `“${s.intake.idea.slice(0, 60)}${s.intake.idea.length > 60 ? "…" : ""}”` : "New offer idea");
  };
  const tierLabel = (t: string) => ECOSYSTEM_TIERS.find((x) => x.id === t)?.label ?? t;
  const stageLabel = (st: string) => BUILDER_STAGES.find((x) => x.id === st)?.label ?? st;

  return (
    <div className="rounded-xl border border-border bg-card">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-3 text-left">
        <Wand2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-display font-semibold text-foreground">Offer Builder sessions</span>
        <span className="text-xs text-muted-foreground">{active.length ? `${active.length} in progress` : "None in progress"} · {sessions.length - active.length} completed</span>
        <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="border-t border-border divide-y divide-border">
          {sessions.map((s) => (
            <li key={s.id} className="px-4 py-2.5 flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{name(s)}</p>
                <p className="text-xs text-muted-foreground">
                  {tierLabel(s.tier)} · {s.mode === "new" ? "New offer" : "Existing offer"} · {s.status === "completed" ? "Completed" : `At ${stageLabel(s.stage)}`} · {new Date(s.updated_at).toLocaleDateString()}
                </p>
              </div>
              {s.status === "active" ? (
                <>
                  <Button size="sm" onClick={() => onOpenSession(s.id)} disabled={busy}>Continue building</Button>
                  <Button size="sm" variant="ghost" onClick={() => onStartNew(s)} disabled={busy}>Start a new session</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => onOpenSession(s.id)}>Review</Button>
                  {s.result_offer_id && offers.some((o) => o.id === s.result_offer_id) && <Button size="sm" variant="ghost" onClick={() => onOpenOffer(s.result_offer_id!)}>Open the finished offer</Button>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
