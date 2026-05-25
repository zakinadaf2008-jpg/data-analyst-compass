
-- ============ Roles ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- First signup becomes admin, everyone else is 'user'
CREATE OR REPLACE FUNCTION public.assign_initial_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_initial_role();

-- Also ensure profile-creation trigger exists (was created earlier as function only)
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ Courses & Lessons ============
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT 'Beginner',
  duration text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'BookOpen',
  tags text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  duration text NOT NULL DEFAULT '',
  youtube_id text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_course ON public.lessons(course_id, sort_order);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Everyone (including anonymous) can read course catalog
CREATE POLICY "Courses are public" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Lessons are public" ON public.lessons FOR SELECT USING (true);

-- Only admins can mutate
CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage lessons" ON public.lessons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed existing course catalog
INSERT INTO public.courses (slug, title, description, level, duration, icon, tags, sort_order) VALUES
  ('math-stats', 'Mathematics & Statistics', 'Master the statistical foundations every analyst needs.', 'Beginner', '20h', 'Calculator', ARRAY['Probability','Regression','Hypothesis'], 1),
  ('excel', 'Excel', 'From formulas to pivot tables and Power Query.', 'Beginner', '12h', 'Sheet', ARRAY['Pivots','Power Query','Formulas'], 2),
  ('sql', 'SQL', 'Query like a pro — joins, windows, CTEs and more.', 'Beginner', '18h', 'Database', ARRAY['Joins','Windows','Subqueries'], 3),
  ('python', 'Python', 'Pandas, NumPy and exploratory data analysis.', 'Intermediate', '30h', 'Code2', ARRAY['Pandas','NumPy','EDA'], 4),
  ('viz', 'Visualization', 'Tell stories with data using Tableau and Power BI.', 'Intermediate', '16h', 'BarChart3', ARRAY['Tableau','Power BI','Plotly'], 5),
  ('ml', 'Machine Learning', 'Supervised and unsupervised models with scikit-learn.', 'Advanced', '40h', 'Brain', ARRAY['Sklearn','Models','Tuning'], 6),
  ('bigdata', 'Big Data', 'Scale your analyses with Spark and cloud platforms.', 'Advanced', '24h', 'Server', ARRAY['Spark','Hadoop','Cloud'], 7),
  ('git', 'Git & GitHub', 'Version control essentials for data professionals.', 'Beginner', '6h', 'GitBranch', ARRAY['Branching','Workflow'], 8);

INSERT INTO public.lessons (course_id, title, duration, youtube_id, sort_order)
SELECT c.id, l.title, l.duration, l.youtube_id, l.sort_order FROM (VALUES
  ('math-stats', 'Statistics — Full University Course', '8h', 'xxpc-HPKN28', 1),
  ('math-stats', 'Probability Fundamentals', '2h', 'uzkc-qNVoOk', 2),
  ('math-stats', 'Linear Regression Explained', '1h', 'nk2CQITm_eo', 3),
  ('excel', 'Excel for Data Analysts — Full Course', '3h', 'opJgMj1IUrc', 1),
  ('excel', 'Pivot Tables Mastery', '1h', 'm0wI61ahfLc', 2),
  ('excel', 'Power Query Tutorial', '1.5h', 'OT5XadIMPzM', 3),
  ('sql', 'SQL Tutorial — Full Database Course', '4h', 'HXV3zeQKqGY', 1),
  ('sql', 'Advanced SQL — Window Functions', '1h', 'Ww71knvhQ-s', 2),
  ('sql', 'SQL Joins Explained', '30m', '9yeOJ0ZMUYw', 3),
  ('python', 'Python for Data Analysis — Full Course', '10h', 'wUSDVGivd-8', 1),
  ('python', 'Pandas Tutorial', '1h', 'vmEHCJofslg', 2),
  ('python', 'NumPy Crash Course', '1h', 'QUT1VHiLmmI', 3),
  ('viz', 'Tableau Full Course', '4h', 'aHaOIvR00So', 1),
  ('viz', 'Power BI Full Course', '4h', 'AGrl-H87pRU', 2),
  ('viz', 'Plotly in Python', '1h', 'GGL6U0k8WYA', 3),
  ('ml', 'Machine Learning — Full Course', '10h', 'i_LwzRVP7bg', 1),
  ('ml', 'Scikit-learn Tutorial', '2h', '0B5eIE_1vpU', 2),
  ('ml', 'ML in 100 Days', '100h', '7eh4d6sabA0', 3),
  ('bigdata', 'Apache Spark Full Course', '3h', '_C8kWso4ne4', 1),
  ('bigdata', 'Hadoop Tutorial', '2h', 'mafw2-CVYnA', 2),
  ('bigdata', 'Data Engineering on AWS', '2h', 'qWru-b6m030', 3),
  ('git', 'Git and GitHub — Full Course', '1h', 'RGOj5yH7evk', 1),
  ('git', 'Git Branching Strategies', '30m', 'Uszj_k0DGsg', 2),
  ('git', 'GitHub Actions Tutorial', '1h', 'R8_veQiYBjI', 3)
) AS l(slug, title, duration, youtube_id, sort_order)
JOIN public.courses c ON c.slug = l.slug;

-- Backfill role for any existing users (oldest becomes admin)
INSERT INTO public.user_roles (user_id, role)
SELECT id, CASE WHEN row_number() OVER (ORDER BY created_at) = 1 THEN 'admin'::public.app_role ELSE 'user'::public.app_role END
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles);
