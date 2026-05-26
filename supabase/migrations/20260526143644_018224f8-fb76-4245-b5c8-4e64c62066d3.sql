
-- lesson_progress
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  course_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own progress" ON public.lesson_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own progress" ON public.lesson_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own progress" ON public.lesson_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_course ON public.lesson_progress(user_id, course_id);

-- bookmarks (course or lesson)
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('course','lesson')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, target_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id);

-- user_stats
CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY,
  xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own stats" ON public.user_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own stats" ON public.user_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own stats" ON public.user_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- create stats row on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created_stats
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_stats();

-- backfill for existing users
INSERT INTO public.user_stats (user_id)
SELECT id FROM auth.users ON CONFLICT DO NOTHING;

-- atomic completion + streak/XP function
CREATE OR REPLACE FUNCTION public.complete_lesson(_lesson_id uuid, _course_id uuid)
RETURNS public.user_stats LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'utc')::date;
  _stats public.user_stats;
  _inserted boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, course_id)
  VALUES (_uid, _lesson_id, _course_id)
  ON CONFLICT (user_id, lesson_id) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  INSERT INTO public.user_stats (user_id) VALUES (_uid) ON CONFLICT DO NOTHING;
  SELECT * INTO _stats FROM public.user_stats WHERE user_id = _uid FOR UPDATE;

  IF _inserted THEN
    IF _stats.last_active_date = _today THEN
      -- same day, streak unchanged
      NULL;
    ELSIF _stats.last_active_date = _today - INTERVAL '1 day' THEN
      _stats.current_streak := _stats.current_streak + 1;
    ELSE
      _stats.current_streak := 1;
    END IF;
    IF _stats.current_streak > _stats.longest_streak THEN
      _stats.longest_streak := _stats.current_streak;
    END IF;
    _stats.xp := _stats.xp + 10;
    _stats.last_active_date := _today;
    _stats.updated_at := now();

    UPDATE public.user_stats SET
      xp = _stats.xp,
      current_streak = _stats.current_streak,
      longest_streak = _stats.longest_streak,
      last_active_date = _stats.last_active_date,
      updated_at = _stats.updated_at
    WHERE user_id = _uid;
  END IF;

  RETURN _stats;
END $$;

GRANT EXECUTE ON FUNCTION public.complete_lesson(uuid, uuid) TO authenticated;
