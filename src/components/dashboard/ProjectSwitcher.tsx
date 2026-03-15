import { useProject } from "@/contexts/ProjectContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderKanban } from "lucide-react";

const ProjectSwitcher = () => {
  const { projects, activeProject, setActiveProjectId } = useProject();

  if (projects.length <= 1) {
    return (
      <div className="px-3 py-2 flex items-center gap-2 text-sm text-sidebar-foreground truncate">
        <FolderKanban className="w-4 h-4 shrink-0" />
        <span className="truncate">{activeProject?.name}</span>
      </div>
    );
  }

  return (
    <Select value={activeProject?.id || ""} onValueChange={setActiveProjectId}>
      <SelectTrigger className="w-full border-0 bg-transparent text-sidebar-foreground text-sm h-auto py-2 px-3 gap-2 focus:ring-0">
        <FolderKanban className="w-4 h-4 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ProjectSwitcher;
