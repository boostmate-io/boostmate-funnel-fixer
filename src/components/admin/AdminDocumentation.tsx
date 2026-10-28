import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, GripVertical, Loader2, Pencil, Plus, Save, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import LessonEditor from "@/components/docs/LessonEditor";
import { EMPTY_DOC, docCourseUrl, docLessonUrl, slugify, tocHeadingLevels, type DocNode } from "@/lib/docs/docContent";

type Status = "draft" | "published";
interface Course { id: string; title: string; description: string | null; slug: string; status: Status; updated_at: string; }
interface LessonRow { id: string; course_id: string; title: string; slug: string; sort_order: number; status: Status; updated_at: string; }

const db = supabase as any;

const StatusBadge = ({ status }: { status: Status }) => (
  <Badge variant={status === "published" ? "default" : "secondary"}>{status === "published" ? "Published" : "Draft"}</Badge>
);

const copyUrl = async (url: string) => {
  try { await navigator.clipboard.writeText(url); toast.success("Public URL copied"); }
  catch { toast.error("Couldn't copy. URL: " + url); }
};

const errMsg = (error: { code?: string; message: string }, what: string) =>
  error.code === "23505" ? `That ${what} URL slug is already in use` : error.message;

/* ---------- Course dialog ---------- */
const CourseDialog = ({ open, onOpenChange, course, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; course: Course | null; onSaved: (c: Course) => void;
}) => {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [slug, setSlug] = useState(""); const [slugTouched, setSlugTouched] = useState(false);
  const [published, setPublished] = useState(false); const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTitle(course?.title ?? ""); setDescription(course?.description ?? ""); setSlug(course?.slug ?? "");
    setSlugTouched(!!course); setPublished(course?.status === "published");
  }, [open, course]);

  const save = async () => {
    const s = slugify(slug);
    if (!title.trim()) return toast.error("Title is required");
    if (!s) return toast.error("URL slug is required");
    setSaving(true);
    const payload = { title: title.trim(), description: description.trim() || null, slug: s, status: published ? "published" : "draft" };
    const q = course ? db.from("doc_courses").update(payload).eq("id", course.id) : db.from("doc_courses").insert(payload);
    const { data, error } = await q.select().single();
    setSaving(false);
    if (error) return toast.error(errMsg(error, "course"));
    toast.success(course ? "Course updated" : "Course created");
    onOpenChange(false); onSaved(data as Course);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{course ? "Edit course" : "New course"}</DialogTitle><DialogDescription>A course is an ordered collection of lessons.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="c-title">Title</Label>
            <Input id="c-title" value={title} placeholder="Business Foundations" onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} /></div>
          <div className="space-y-1.5"><Label htmlFor="c-desc">Description (optional)</Label>
            <Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="space-y-1.5"><Label htmlFor="c-slug">URL slug</Label>
            <div className="flex items-center gap-1 text-sm"><span className="text-muted-foreground shrink-0">/docs/</span>
              <Input id="c-slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} onBlur={() => setSlug(slugify(slug))} /></div></div>
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm"><span><span className="font-medium">Published</span><span className="block text-muted-foreground text-xs">Only published lessons in published courses are public.</span></span>
            <Switch checked={published} onCheckedChange={setPublished} /></label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------- Lesson editor view ---------- */
const LessonEditView = ({ course, lessonId, onBack }: { course: Course; lessonId: string; onBack: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [content, setContent] = useState<DocNode>(EMPTY_DOC);
  const [tocLevels, setTocLevels] = useState<number[]>([1]);
  const [stepByStep, setStepByStep] = useState(false);
  const [initial, setInitial] = useState<DocNode | null>(null);
  const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState("");
  const dirtyRef = useRef(false); dirtyRef.current = dirty;

  useEffect(() => {
    (async () => {
      const { data, error } = await db.from("doc_lessons").select("*").eq("id", lessonId).single();
      if (error) { toast.error("Couldn't load lesson: " + error.message); onBack(); return; }
      setTitle(data.title); setSlug(data.slug); setSavedSlug(data.slug); setStatus(data.status);
      setTocLevels(tocHeadingLevels(data.toc_heading_levels));
      setStepByStep(data.step_by_step === true);
      const doc = (data.content as DocNode) ?? EMPTY_DOC; setContent(doc); setInitial(doc); setLoading(false);
    })();
  }, [lessonId, onBack]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const mark = () => setDirty(true);

  const save = async () => {
    const s = slugify(slug);
    if (!title.trim()) return toast.error("Title is required");
    if (!s) return toast.error("URL slug is required");
    setSaving(true);
    const { error } = await db.from("doc_lessons").update({ title: title.trim(), slug: s, status, content, toc_heading_levels: tocLevels, step_by_step: stepByStep }).eq("id", lessonId);
    setSaving(false);
    if (error) return toast.error("Save failed: " + errMsg(error, "lesson"));
    setSlug(s); setSavedSlug(s); setDirty(false); toast.success("Lesson saved");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const back = () => { if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return; onBack(); };

  if (loading || !initial) return <div className="flex items-center gap-2 text-muted-foreground py-12"><Loader2 className="w-4 h-4 animate-spin" />Loading lesson…</div>;

  const url = docLessonUrl(course.slug, savedSlug);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={back} className="gap-1"><ArrowLeft className="w-4 h-4" />{course.title}</Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {dirty ? <span className="text-xs text-muted-foreground">Unsaved changes</span> : <span className="text-xs text-muted-foreground">All changes saved</span>}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyUrl(url)}><Copy className="w-4 h-4" />Copy URL</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(url, "_blank", "noopener")}><ExternalLink className="w-4 h-4" />Preview</Button>
          <Button size="sm" className="gap-1.5" onClick={save} disabled={saving || !dirty}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
        <div className="space-y-1.5"><Label htmlFor="l-title">Lesson title</Label><Input id="l-title" value={title} onChange={(e) => { setTitle(e.target.value); mark(); }} /></div>
        <div className="space-y-1.5"><Label htmlFor="l-slug">URL slug</Label>
          <div className="flex items-center gap-1 text-sm"><span className="text-muted-foreground shrink-0 truncate max-w-[10rem]">/docs/{course.slug}/</span>
            <Input id="l-slug" value={slug} onChange={(e) => { setSlug(e.target.value); mark(); }} onBlur={() => setSlug(slugify(slug))} /></div></div>
        <label className="flex items-center gap-2 h-10 text-sm"><Switch checked={status === "published"} onCheckedChange={(v) => { setStatus(v ? "published" : "draft"); mark(); }} />{status === "published" ? "Published" : "Draft"}</label>
      </div>
      <fieldset className="flex flex-wrap items-center gap-4 text-sm">
        <legend className="font-medium mb-2">On This Page</legend>
        {[1, 2, 3].map((level) => (
          <label key={level} className="flex items-center gap-2">
            <Checkbox checked={tocLevels.includes(level)} onCheckedChange={(checked) => {
              setTocLevels((current) => [1, 2, 3].filter((l) => l === level ? checked === true : current.includes(l)));
              mark();
            }} />H{level}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={stepByStep} onCheckedChange={(checked) => { setStepByStep(checked === true); mark(); }} />Enable Step-by-Step Mode
      </label>
      {course.status !== "published" && status === "published" && (
        <p className="text-xs text-muted-foreground">This lesson becomes public once the course is published too.</p>
      )}
      <LessonEditor initialContent={initial} onChange={(d) => { setContent(d); mark(); }} />
    </div>
  );
};

/* ---------- Course detail ---------- */
const CourseView = ({ course, onBack, onCourseChanged, onDeleted }: {
  course: Course; onBack: () => void; onCourseChanged: (c: Course) => void; onDeleted: () => void;
}) => {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [courseDialog, setCourseDialog] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(""); const [newSlug, setNewSlug] = useState(""); const [newSlugTouched, setNewSlugTouched] = useState(false);
  const [deleteLesson, setDeleteLesson] = useState<LessonRow | null>(null);
  const [deleteCourse, setDeleteCourse] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("doc_lessons").select("id, course_id, title, slug, sort_order, status, updated_at").eq("course_id", course.id).order("sort_order");
    if (error) toast.error("Couldn't load lessons: " + error.message);
    setLessons((data ?? []) as LessonRow[]); setLoading(false);
  }, [course.id]);
  useEffect(() => { load(); }, [load]);

  const persistOrder = async (next: LessonRow[]) => {
    const prev = lessons;
    setLessons(next.map((l, i) => ({ ...l, sort_order: i })));
    const results = await Promise.all(next.map((l, i) => db.from("doc_lessons").update({ sort_order: i }).eq("id", l.id)));
    if (results.some((r: { error: unknown }) => r.error)) { toast.error("Couldn't save the new order"); setLessons(prev); load(); }
    else toast.success("Lesson order saved");
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= lessons.length || from === to) return;
    const next = [...lessons]; const [m] = next.splice(from, 1); next.splice(to, 0, m); persistOrder(next);
  };

  const createLesson = async () => {
    const s = slugify(newSlug);
    if (!newTitle.trim() || !s) return toast.error("Title and URL slug are required");
    const { data, error } = await db.from("doc_lessons").insert({ course_id: course.id, title: newTitle.trim(), slug: s, sort_order: lessons.length }).select("id").single();
    if (error) return toast.error(errMsg(error, "lesson"));
    setNewOpen(false); setNewTitle(""); setNewSlug(""); setNewSlugTouched(false);
    setEditingLesson(data.id);
  };

  const doDeleteLesson = async () => {
    if (!deleteLesson) return;
    const { error } = await db.from("doc_lessons").delete().eq("id", deleteLesson.id);
    if (error) return toast.error("Delete failed: " + error.message);
    toast.success(`"${deleteLesson.title}" deleted`); setDeleteLesson(null); load();
  };
  const doDeleteCourse = async () => {
    const { error } = await db.from("doc_courses").delete().eq("id", course.id);
    if (error) return toast.error("Delete failed: " + error.message);
    toast.success(`"${course.title}" deleted`); onDeleted();
  };

  const backFromLesson = useCallback(() => { setEditingLesson(null); load(); }, [load]);
  if (editingLesson) return <LessonEditView course={course} lessonId={editingLesson} onBack={backFromLesson} />;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="w-4 h-4" />All courses</Button>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h2 className="text-xl font-display font-bold">{course.title}</h2><StatusBadge status={course.status} /></div>
          {course.description && <p className="text-sm text-muted-foreground mt-1">{course.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">/docs/{course.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyUrl(docCourseUrl(course.slug))}><Copy className="w-4 h-4" />Copy URL</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(docCourseUrl(course.slug), "_blank", "noopener")}><ExternalLink className="w-4 h-4" />Open</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCourseDialog(true)}><Pencil className="w-4 h-4" />Edit</Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => setDeleteCourse(true)}><Trash2 className="w-4 h-4" />Delete</Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Lessons</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}><Plus className="w-4 h-4" />Add lesson</Button>
      </div>

      {loading ? <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
        : lessons.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No lessons yet. Add your first lesson to start writing.</div>
        : (
          <ol className="rounded-lg border divide-y bg-card">
            {lessons.map((l, i) => (
              <li key={l.id} draggable onDragStart={() => setDragId(l.id)} onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { const from = lessons.findIndex((x) => x.id === dragId); if (from >= 0) move(from, i); }}
                className={`flex items-center gap-3 px-3 py-2.5 ${dragId === l.id ? "opacity-50" : ""}`}>
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" aria-hidden />
                <span className="text-xs text-muted-foreground w-5 tabular-nums">{i + 1}</span>
                <button className="flex-1 min-w-0 text-left" onClick={() => setEditingLesson(l.id)}>
                  <span className="font-medium hover:text-primary truncate block">{l.title}</span>
                  <span className="text-xs text-muted-foreground truncate block">/{l.slug}</span>
                </button>
                <StatusBadge status={l.status} />
                <div className="flex gap-0.5">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Move down" disabled={i === lessons.length - 1} onClick={() => move(i, i + 1)}><ArrowDown className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Copy public URL" onClick={() => copyUrl(docLessonUrl(course.slug, l.slug))}><Copy className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Preview" onClick={() => window.open(docLessonUrl(course.slug, l.slug), "_blank", "noopener")}><ExternalLink className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit" onClick={() => setEditingLesson(l.id)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Delete" onClick={() => setDeleteLesson(l)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </li>
            ))}
          </ol>
        )}

      <CourseDialog open={courseDialog} onOpenChange={setCourseDialog} course={course} onSaved={onCourseChanged} />

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New lesson</DialogTitle><DialogDescription>Each lesson is one complete training document.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="n-title">Title</Label>
              <Input id="n-title" value={newTitle} placeholder="Your Offer" onChange={(e) => { setNewTitle(e.target.value); if (!newSlugTouched) setNewSlug(slugify(e.target.value)); }} /></div>
            <div className="space-y-1.5"><Label htmlFor="n-slug">URL slug</Label>
              <Input id="n-slug" value={newSlug} onChange={(e) => { setNewSlug(e.target.value); setNewSlugTouched(true); }} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button><Button onClick={createLesson}>Create & edit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLesson} onOpenChange={(v) => !v && setDeleteLesson(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete lesson?</AlertDialogTitle>
          <AlertDialogDescription>"{deleteLesson?.title}" and its content will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDeleteLesson}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteCourse} onOpenChange={setDeleteCourse}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete course?</AlertDialogTitle>
          <AlertDialogDescription>"{course.title}" and all {lessons.length} of its lessons will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDeleteCourse}>Delete course</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ---------- Course list ---------- */
const AdminDocumentation = () => {
  const [courses, setCourses] = useState<(Course & { lessonCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Course | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("doc_courses").select("id, title, description, slug, status, updated_at, doc_lessons(count)").order("created_at");
    if (error) toast.error("Couldn't load courses: " + error.message);
    setCourses(((data ?? []) as any[]).map((c) => ({ ...c, lessonCount: c.doc_lessons?.[0]?.count ?? 0 })));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (selected) {
    return <div className="mt-4"><CourseView course={selected} onBack={() => { setSelected(null); load(); }}
      onCourseChanged={setSelected} onDeleted={() => { setSelected(null); load(); }} /></div>;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end"><Button className="gap-1.5" onClick={() => setNewOpen(true)}><Plus className="w-4 h-4" />New course</Button></div>
      {loading ? <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
        : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No courses yet</p><p className="text-sm text-muted-foreground">Create a course, then add lessons to it.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)} className="text-left rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-2"><span className="font-display font-semibold">{c.title}</span><StatusBadge status={c.status} /></div>
                {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                <p className="text-xs text-muted-foreground mt-2">{c.lessonCount} lesson{c.lessonCount === 1 ? "" : "s"} · /docs/{c.slug}</p>
              </button>
            ))}
          </div>
        )}
      <CourseDialog open={newOpen} onOpenChange={setNewOpen} course={null} onSaved={(c) => { load(); setSelected(c); }} />
    </div>
  );
};

export default AdminDocumentation;
