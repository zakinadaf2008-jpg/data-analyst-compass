
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Award',
  criteria_type text NOT NULL,
  threshold int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements readable by all" ON public.achievements FOR SELECT USING (true);

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "view others achievements public" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "insert own achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO public.achievements (code, title, description, icon, criteria_type, threshold) VALUES
  ('first_steps', 'First Steps', 'Complete your first lesson', 'Footprints', 'xp', 10),
  ('xp_100', 'Century Club', 'Earn 100 XP', 'Zap', 'xp', 100),
  ('xp_500', 'Power Learner', 'Earn 500 XP', 'Flame', 'xp', 500),
  ('xp_1000', 'XP Master', 'Earn 1000 XP', 'Trophy', 'xp', 1000),
  ('streak_7', 'Week Warrior', 'Maintain a 7-day streak', 'Calendar', 'streak', 7),
  ('streak_30', 'Unstoppable', 'Maintain a 30-day streak', 'Rocket', 'streak', 30),
  ('first_cert', 'Course Champion', 'Earn your first certificate', 'Award', 'certificates', 1),
  ('showcase_creator', 'Showcase Creator', 'Publish a project to the showcase', 'Sparkles', 'showcase', 1);
