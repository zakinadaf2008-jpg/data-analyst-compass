
CREATE TABLE public.study_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  title text NOT NULL,
  detail text,
  course_slug text,
  done boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX study_tasks_user_week_idx ON public.study_tasks(user_id, week_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_tasks TO authenticated;
GRANT ALL ON public.study_tasks TO service_role;

ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own tasks" ON public.study_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own tasks" ON public.study_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own tasks" ON public.study_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own tasks" ON public.study_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER study_tasks_set_updated
BEFORE UPDATE ON public.study_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
