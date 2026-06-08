
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "system inserts" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

-- Trigger: showcase like -> notify owner
CREATE OR REPLACE FUNCTION public.notify_showcase_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _owner uuid;
  _title text;
  _slug text;
BEGIN
  SELECT user_id, title, slug INTO _owner, _title, _slug
  FROM public.showcase_projects WHERE id = NEW.project_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (_owner, 'showcase_like', 'Someone liked your project ❤️', _title, '/showcase');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_showcase_like
AFTER INSERT ON public.showcase_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_showcase_like();

-- Trigger: lesson comment -> notify other participants
CREATE OR REPLACE FUNCTION public.notify_lesson_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _lesson_title text;
  _course_slug text;
BEGIN
  SELECT l.title, c.slug INTO _lesson_title, _course_slug
  FROM public.lessons l JOIN public.courses c ON c.id = l.course_id
  WHERE l.id = NEW.lesson_id;

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  SELECT DISTINCT lp.user_id, 'lesson_comment', 'New comment on a lesson you''re taking',
         coalesce(_lesson_title, 'Lesson discussion'),
         '/courses/' || coalesce(_course_slug, '')
  FROM public.lesson_progress lp
  WHERE lp.lesson_id = NEW.lesson_id AND lp.user_id <> NEW.user_id;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_lesson_comment
AFTER INSERT ON public.lesson_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_lesson_comment();

-- Trigger: achievement earned -> notify
CREATE OR REPLACE FUNCTION public.notify_achievement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _title text;
BEGIN
  SELECT title INTO _title FROM public.achievements WHERE id = NEW.achievement_id;
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (NEW.user_id, 'achievement', 'Achievement unlocked 🏆', _title, '/achievements');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_achievement
AFTER INSERT ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.notify_achievement();
