-- 1) Notes table
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  course_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_user_lesson ON public.notes(user_id, lesson_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER notes_set_updated_at BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Certificates table (auto-issued when course is fully completed)
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

GRANT SELECT, INSERT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own certificates" ON public.certificates FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Inserts happen via SECURITY DEFINER function only; no insert policy for users.

-- 3) Update complete_lesson to auto-issue certificate
CREATE OR REPLACE FUNCTION public.complete_lesson(_lesson_id uuid, _course_id uuid)
RETURNS user_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'utc')::date;
  _stats public.user_stats;
  _inserted boolean := false;
  _total int;
  _done int;
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

    -- Issue certificate if all lessons done
    SELECT count(*) INTO _total FROM public.lessons WHERE course_id = _course_id;
    SELECT count(*) INTO _done FROM public.lesson_progress WHERE user_id = _uid AND course_id = _course_id;
    IF _total > 0 AND _done >= _total THEN
      INSERT INTO public.certificates (user_id, course_id)
      VALUES (_uid, _course_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN _stats;
END $function$;

-- 4) Public leaderboard function (top users by XP)
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  xp int,
  current_streak int,
  longest_streak int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.user_id,
         COALESCE(p.display_name, 'Learner') AS display_name,
         p.avatar_url,
         s.xp,
         s.current_streak,
         s.longest_streak
  FROM public.user_stats s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE s.xp > 0
  ORDER BY s.xp DESC, s.longest_streak DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO anon, authenticated;