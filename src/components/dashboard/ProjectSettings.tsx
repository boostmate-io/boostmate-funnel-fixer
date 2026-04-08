import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

const ProjectSettings = () => {
  const { t } = useTranslation();
  const { activeProject, renameProject } = useProject();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const handleRename = async () => {
    if (!editName.trim() || !activeProject) return;
    await renameProject(activeProject.id, editName.trim());
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display font-bold text-foreground">{t("projects.title")}</h3>
      <p className="text-sm text-muted-foreground">{t("projects.description")}</p>

      {activeProject && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-primary bg-primary/5">
          {editing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="h-8 text-sm"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRename}>
                <Check className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">{activeProject.name}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setEditing(true); setEditName(activeProject.name); }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;
