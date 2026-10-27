CREATE TABLE public.doc_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.doc_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.doc_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);
CREATE INDEX doc_lessons_course_order_idx ON public.doc_lessons(course_id, sort_order);

GRANT SELECT ON public.doc_courses TO anon;
GRANT SELECT ON public.doc_lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_lessons TO authenticated;
GRANT ALL ON public.doc_courses TO service_role;
GRANT ALL ON public.doc_lessons TO service_role;

ALTER TABLE public.doc_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published courses" ON public.doc_courses
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admins manage courses" ON public.doc_courses
  FOR ALL TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.doc_course_is_published(_course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.doc_courses WHERE id = _course_id AND status = 'published')
$$;

CREATE POLICY "Public can read published lessons" ON public.doc_lessons
  FOR SELECT TO anon, authenticated USING (status = 'published' AND public.doc_course_is_published(course_id));
CREATE POLICY "Admins manage lessons" ON public.doc_lessons
  FOR ALL TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TRIGGER doc_courses_updated_at BEFORE UPDATE ON public.doc_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER doc_lessons_updated_at BEFORE UPDATE ON public.doc_lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();