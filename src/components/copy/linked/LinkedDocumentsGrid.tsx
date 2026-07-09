import { FileText, ExternalLink, Trash2, Unlink, Plus, icons, Gem, MoreHorizontal, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function LucideIcon({ name, className }: { name?: string | null; className?: string }) {
  const IconComp = name ? (icons as any)[name] : null;
  if (!IconComp) return <Gem className={className} />;
  return <IconComp className={className} />;
}

export interface LinkedDocument {
  id: string;
  name: string;
  type: string;
  status?: string | null;
  updated_at: string;
}

export interface FrameworkInfo {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
}

interface LinkedDocumentsGridProps {
  documents: LinkedDocument[];
  frameworkByType?: Record<string, FrameworkInfo | undefined>;
  thumbnails: Record<string, string | undefined>; // docId → signed URL
  readOnly?: boolean;
  onOpen?: (id: string) => void;
  onCreate?: () => void;
  onDetach?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  createLabel?: string;
  emptyLabel?: string;
  /** Tailwind grid-cols classes. Default: `grid-cols-1 sm:grid-cols-2`. */
  gridClassName?: string;
}

function formatRelative(date: string): string {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  shipped: "bg-primary/15 text-primary",
};

const LinkedDocumentsGrid = ({
  documents,
  frameworkByType,
  thumbnails,
  readOnly,
  onOpen,
  onCreate,
  onDetach,
  onDelete,
  onDuplicate,
  createLabel = "New document",
  emptyLabel = "No linked documents yet.",
  gridClassName = "grid-cols-1 sm:grid-cols-2",
}: LinkedDocumentsGridProps) => {
  if (documents.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        </div>
        {!readOnly && onCreate && (
          <Button size="sm" className="w-full h-8 text-xs" onClick={onCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" /> {createLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${gridClassName}`}>
        {documents.map((doc) => {
          const framework = frameworkByType?.[doc.type];
          const thumb = thumbnails[doc.id];
          const status = doc.status || undefined;
          return (
            <div
              key={doc.id}
              className="group relative rounded-lg border border-border bg-card overflow-hidden hover:shadow-card-hover transition-shadow cursor-pointer flex flex-col"
              onClick={() => onOpen?.(doc.id)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-muted/40 to-muted/10 flex items-center justify-center relative">
                {thumb ? (
                  <img src={thumb} alt={doc.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <LucideIcon name={framework?.icon || "FileText"} className="w-8 h-8 text-muted-foreground/60" />
                )}
                {!readOnly && (onDetach || onDelete) && (
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 bg-background/90 backdrop-blur"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {onOpen && (
                          <DropdownMenuItem onClick={() => onOpen(doc.id)}>
                            <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open
                          </DropdownMenuItem>
                        )}
                        {onDetach && (
                          <DropdownMenuItem onClick={() => onDetach(doc.id)}>
                            <Unlink className="w-3.5 h-3.5 mr-2" /> Detach
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDelete(doc.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-2.5 space-y-1.5 flex-1">
                <p className="text-xs font-medium text-foreground truncate leading-tight" title={doc.name}>
                  {doc.name}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {framework?.name && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {framework.name}
                    </Badge>
                  )}
                  {status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_STYLES[status] || "bg-muted text-muted-foreground"}`}>
                      {status}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">{formatRelative(doc.updated_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {!readOnly && onCreate && (
        <Button size="sm" className="w-full h-8 text-xs" onClick={onCreate}>
          <Plus className="w-3.5 h-3.5 mr-1" /> {createLabel}
        </Button>
      )}
    </div>
  );
};

export default LinkedDocumentsGrid;
