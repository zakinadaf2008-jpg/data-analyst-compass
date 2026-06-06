CREATE TABLE public.showcase_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 4000),
  project_url text CHECK (project_url IS NULL OR length(project_url) <= 500),
  repo_url text CHECK (repo_url IS NULL OR length(repo_url) <= 500),
  cover_image_url text CHECK (cover_image_url IS NULL OR length(cover_image_url) <= 500),
  tags text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.showcase_projects TO authenticated;
GRANT SELECT ON public.showcase_projects TO anon;
GRANT ALL ON public.showcase_projects TO service_role;

ALTER TABLE public.showcase_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published projects"
  ON public.showcase_projects FOR SELECT TO anon, authenticated
  USING (published = true OR auth.uid() = user_id);

CREATE POLICY "Users insert own projects"
  ON public.showcase_projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own projects"
  ON public.showcase_projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own projects"
  ON public.showcase_projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX showcase_projects_recent_idx ON public.showcase_projects(created_at DESC) WHERE published = true;

CREATE TRIGGER showcase_projects_set_updated
  BEFORE UPDATE ON public.showcase_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.showcase_likes (
  project_id uuid NOT NULL REFERENCES public.showcase_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.showcase_likes TO authenticated;
GRANT SELECT ON public.showcase_likes TO anon;
GRANT ALL ON public.showcase_likes TO service_role;

ALTER TABLE public.showcase_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads likes"
  ON public.showcase_likes FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users like as themselves"
  ON public.showcase_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own like"
  ON public.showcase_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);