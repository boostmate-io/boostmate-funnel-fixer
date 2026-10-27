import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, ArrowRight, ListTree, Loader2, Menu } from "lucide-react";
import DocContentRenderer from "@/components/docs/DocContentRenderer";
import { extractHeadings, type DocNode, type TocItem } from "@/lib/docs/docContent";
import logo from "@/assets/logo-boostmate.svg";

// Uses the regular client: visitors are anonymous and RLS returns only published content;
// signed-in admins additionally see drafts so Preview works before publishing.
const db = supabase as any;

interface Course { id: string; title: string; description: string | null; slug: string; status: string; }
interface LessonLink { id: string; title: string; slug: string; status: string; }
interface Lesson extends LessonLink { content: DocNode; }

const setMeta = (title: string, description: string) => {
  document.title = title;
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
  m.setAttribute("content", description);
};

const LessonNav = ({ course, lessons, activeSlug, onNavigate }: { course: Course; lessons: LessonLink[]; activeSlug?: string; onNavigate?: () => void }) => (
  <nav aria-label="Course lessons">
    <Link to={`/docs/${course.slug}`} onClick={onNavigate} className="block font-display font-bold text-foreground mb-3 hover:text-primary">{course.title}</Link>
    <ol className="space-y-0.5">
      {lessons.map((l, i) => {
        const active = l.slug === activeSlug;
        return (
          <li key={l.id}>
            <Link to={`/docs/${course.slug}/${l.slug}`} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={`flex gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <span className="tabular-nums w-4 shrink-0 opacity-60">{i + 1}</span>
              <span>{l.title}{l.status !== "published" && <span className="ml-1 text-[10px] uppercase opacity-70">(draft)</span>}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  </nav>
);

const Toc = ({ items, activeId, onNavigate }: { items: TocItem[]; activeId: string | null; onNavigate?: () => void }) => {
  if (!items.length) return null;
  const minLevel = Math.min(...items.map((i) => i.level));
  return (
    <nav aria-label="On this page">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">On this page</p>
      <ul className="space-y-1 border-l">
        {items.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                const go = () => { document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(null, "", `#${h.id}`); };
                if (onNavigate) { onNavigate(); setTimeout(go, 300); } else go();
              }}
              style={{ paddingLeft: `${0.75 + (h.level - minLevel) * 0.75}rem` }}
              className={`-ml-px block border-l py-1 pr-2 text-sm leading-snug transition-colors ${activeId === h.id ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"} ${h.level === minLevel ? "" : "text-[13px]"}`}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const useActiveHeading = (ids: string[]) => {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (!ids.length) return;
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const visible = new Set<string>();
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
      const first = ids.find((id) => visible.has(id));
      if (first) setActive(first);
      else {
        // Between headings: pick the last one above the viewport.
        let last: string | null = ids[0];
        for (const el of els) if (el.getBoundingClientRect().top < 100) last = el.id;
        setActive(last);
      }
    }, { rootMargin: "-80px 0px -60% 0px" });
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ids]);
  return active;
};

const DocsViewer = () => {
  const { courseSlug, lessonSlug } = useParams<{ courseSlug: string; lessonSlug?: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<LessonLink[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");
  const [navOpen, setNavOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState("loading");
      const { data: c } = await db.from("doc_courses").select("id, title, description, slug, status").eq("slug", courseSlug).maybeSingle();
      if (cancelled) return;
      if (!c) { setState("notfound"); return; }
      const { data: ls } = await db.from("doc_lessons").select("id, title, slug, status").eq("course_id", c.id).order("sort_order");
      let current: Lesson | null = null;
      if (lessonSlug) {
        const { data: l } = await db.from("doc_lessons").select("id, title, slug, status, content").eq("course_id", c.id).eq("slug", lessonSlug).maybeSingle();
        if (cancelled) return;
        if (!l) { setCourse(c); setLessons(ls ?? []); setState("notfound"); return; }
        current = l;
      }
      if (cancelled) return;
      setCourse(c); setLessons(ls ?? []); setLesson(current); setState("ok");
      if (current) setMeta(`${current.title} · ${c.title} | Boostmate`, `${current.title} — a lesson in ${c.title}.`);
      else setMeta(`${c.title} | Boostmate`, c.description || `${c.title} — training by Boostmate.`);
    })();
    return () => { cancelled = true; };
  }, [courseSlug, lessonSlug]);

  useEffect(() => {
    if (state !== "ok" || !lesson) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
    else window.scrollTo(0, 0);
  }, [state, lesson]);

  const toc = useMemo(() => (lesson ? extractHeadings(lesson.content) : []), [lesson]);
  const tocIds = useMemo(() => toc.map((t) => t.id), [toc]);
  const activeId = useActiveHeading(state === "ok" ? tocIds : []);

  const idx = lesson ? lessons.findIndex((l) => l.id === lesson.id) : -1;
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null;
  const isDraft = course?.status !== "published" || (lesson && lesson.status !== "published");

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-30 h-14 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-[1400px] h-full px-4 sm:px-6 flex items-center gap-3">
          {course && lessons.length > 0 && (
            <Button variant="ghost" size="icon" className="lg:hidden -ml-2" aria-label="Open course navigation" onClick={() => setNavOpen(true)}><Menu className="w-5 h-5" /></Button>
          )}
          <img src={logo} alt="Boostmate" className="h-6" />
          {course && <span className="hidden sm:inline text-sm text-muted-foreground truncate">/ {course.title}</span>}
          {toc.length > 0 && (
            <Button variant="ghost" size="sm" className="xl:hidden ml-auto gap-1.5" onClick={() => setTocOpen(true)}><ListTree className="w-4 h-4" />On this page</Button>
          )}
        </div>
      </header>

      {isDraft && state === "ok" && (
        <div className="bg-muted text-center text-xs py-1.5 text-muted-foreground">Draft preview — only admins can see this until it's published.</div>
      )}

      {state === "loading" && <div className="flex justify-center py-24 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>}

      {state === "notfound" && (
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Page not found</h1>
          <p className="text-muted-foreground mb-6">This page doesn't exist or isn't published yet.</p>
          {course && <Button asChild variant="outline"><Link to={`/docs/${course.slug}`}>Back to {course.title}</Link></Button>}
        </div>
      )}

      {state === "ok" && course && (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 flex gap-10">
          {lesson && (
            <aside className="hidden lg:block w-60 shrink-0">
              <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-2">
                <LessonNav course={course} lessons={lessons} activeSlug={lesson.slug} />
              </div>
            </aside>
          )}

          <main className="flex-1 min-w-0 py-8 sm:py-12">
            <div className="mx-auto max-w-[720px]">
              {lesson ? (
                <article>
                  <p className="text-sm text-primary font-medium mb-2">{course.title}</p>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-8">{lesson.title}</h1>
                  <DocContentRenderer doc={lesson.content} />
                  <div className="mt-16 pt-6 border-t grid gap-3 sm:grid-cols-2">
                    {prev ? (
                      <Link to={`/docs/${course.slug}/${prev.slug}`} className="rounded-lg border p-4 hover:border-primary/50 transition-colors">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Previous</span>
                        <span className="font-medium">{prev.title}</span>
                      </Link>
                    ) : <span />}
                    {next && (
                      <Link to={`/docs/${course.slug}/${next.slug}`} className="rounded-lg border p-4 text-right hover:border-primary/50 transition-colors">
                        <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">Next<ArrowRight className="w-3 h-3" /></span>
                        <span className="font-medium">{next.title}</span>
                      </Link>
                    )}
                  </div>
                </article>
              ) : (
                <section>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{course.title}</h1>
                  {course.description && <p className="mt-4 text-lg text-muted-foreground leading-relaxed whitespace-pre-line">{course.description}</p>}
                  <h2 className="mt-10 mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lessons</h2>
                  {lessons.length === 0 ? <p className="text-muted-foreground">No lessons have been published yet.</p> : (
                    <ol className="rounded-xl border divide-y">
                      {lessons.map((l, i) => (
                        <li key={l.id}>
                          <Link to={`/docs/${course.slug}/${l.slug}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors">
                            <span className="w-8 h-8 shrink-0 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center tabular-nums">{i + 1}</span>
                            <span className="flex-1 font-medium">{l.title}{l.status !== "published" && <span className="ml-2 text-xs text-muted-foreground">(draft)</span>}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              )}
            </div>
          </main>

          {lesson && toc.length > 0 && (
            <aside className="hidden xl:block w-60 shrink-0">
              <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8">
                <Toc items={toc} activeId={activeId} />
              </div>
            </aside>
          )}
        </div>
      )}

      {course && (
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto">
            <SheetHeader><SheetTitle className="sr-only">Course navigation</SheetTitle></SheetHeader>
            <div className="mt-4"><LessonNav course={course} lessons={lessons} activeSlug={lesson?.slug} onNavigate={() => setNavOpen(false)} /></div>
          </SheetContent>
        </Sheet>
      )}
      <Sheet open={tocOpen} onOpenChange={setTocOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-xs overflow-y-auto">
          <SheetHeader><SheetTitle className="sr-only">On this page</SheetTitle></SheetHeader>
          <div className="mt-4"><Toc items={toc} activeId={activeId} onNavigate={() => setTocOpen(false)} /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DocsViewer;
