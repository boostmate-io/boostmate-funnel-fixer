import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

const ProjectSettings = () => {
  const { t } = useTranslation();
  const { projects, activeProject, setActiveProjectId, createProject, renameProject, deleteProject } = useProject();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject(newName.trim());
    setNewName("");
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await renameProject(id, editName.trim());
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display font-bold text-foreground">{t("projects.title")}</h3>
      <p className="text-sm text-muted-foreground">{t("projects.description")}</p>

      <div className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              project.id === activeProject?.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent"
            }`}
          >
            {editingId === project.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(project.id)}
                  className="h-8 text-sm"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRename(project.id)}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setActiveProjectId(project.id)}
                  className="text-left flex-1"
                >
                  <p className="text-sm font-medium text-foreground">{project.name}</p>
                  {project.id === activeProject?.id && (
                    <p className="text-[11px] text-primary">{t("projects.active")}</p>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setEditingId(project.id); setEditName(project.name); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteProject(project.id)}
                    disabled={projects.length <= 1}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("projects.newPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="text-sm"
        />
        <Button onClick={handleCreate} size="sm" disabled={!newName.trim()}>
          <Plus className="w-4 h-4 mr-1" /> {t("projects.add")}
        </Button>
      </div>
    </div>
  );
};

export default ProjectSettings;
