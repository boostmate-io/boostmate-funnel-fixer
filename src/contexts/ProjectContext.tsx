import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuthReady } from "@/hooks/useAuthReady";

interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  createProject: (name: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
};

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const { user, isReady } = useAuthReady();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() =>
    localStorage.getItem("activeProjectId")
  );
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const projectList = (data || []) as Project[];

    if (projectList.length === 0) {
      const { data: newProj } = await supabase
        .from("projects")
        .insert({ user_id: userId, name: t("projects.defaultName") })
        .select()
        .single();
      if (newProj) {
        const proj = newProj as Project;
        projectList.push(proj);
      }
    }

    setProjects(projectList);

    const stored = localStorage.getItem("activeProjectId");
    const match = projectList.find((p) => p.id === stored);
    if (match) {
      setActiveProjectId(match.id);
    } else if (projectList.length > 0) {
      setActiveProjectId(projectList[0].id);
      localStorage.setItem("activeProjectId", projectList[0].id);
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (!isReady) {
      setLoading(true);
      return;
    }

    if (!user) {
      setProjects([]);
      setActiveProjectId(null);
      localStorage.removeItem("activeProjectId");
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadProjects(user.id);
  }, [isReady, user, loadProjects]);

  useEffect(() => {
    if (activeProjectId) localStorage.setItem("activeProjectId", activeProjectId);
  }, [activeProjectId]);

  const createProject = useCallback(async (name: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name })
      .select()
      .single();
    if (error) { toast.error(t("projects.saveError")); return; }
    const proj = data as Project;
    setProjects((prev) => [...prev, proj]);
    setActiveProjectId(proj.id);
    toast.success(t("projects.created"));
  }, [user, t]);

  const renameProject = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from("projects").update({ name }).eq("id", id);
    if (error) { toast.error(t("projects.saveError")); return; }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    toast.success(t("projects.renamed"));
  }, [t]);

  const deleteProject = useCallback(async (id: string) => {
    if (projects.length <= 1) { toast.error(t("projects.cannotDeleteLast")); return; }
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(t("projects.deleteError")); return; }
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (activeProjectId === id && remaining.length > 0) {
      setActiveProjectId(remaining[0].id);
    }
    toast.success(t("projects.deleted"));
  }, [projects, activeProjectId, t]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProjectId, createProject, renameProject, deleteProject, loading }}>
      {children}
    </ProjectContext.Provider>
  );
};
