
-- MENTORS
CREATE TABLE public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text NOT NULL,
  bio text,
  expertise text[] NOT NULL DEFAULT '{}',
  hourly_rate_usd numeric(10,2) DEFAULT 0,
  timezone text DEFAULT 'UTC',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentors TO authenticated;
GRANT SELECT ON public.mentors TO anon;
GRANT ALL ON public.mentors TO service_role;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentors are publicly viewable" ON public.mentors FOR SELECT USING (true);
CREATE POLICY "Users manage own mentor profile" ON public.mentors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_mentors_updated BEFORE UPDATE ON public.mentors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SLOTS
CREATE TABLE public.mentor_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentor_slots_mentor ON public.mentor_slots(mentor_id, starts_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_slots TO authenticated;
GRANT SELECT ON public.mentor_slots TO anon;
GRANT ALL ON public.mentor_slots TO service_role;
ALTER TABLE public.mentor_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Slots publicly viewable" ON public.mentor_slots FOR SELECT USING (true);
CREATE POLICY "Mentor manages own slots" ON public.mentor_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = mentor_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = mentor_id AND m.user_id = auth.uid()));

-- BOOKINGS
CREATE TABLE public.mentor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL UNIQUE REFERENCES public.mentor_slots(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  notes text,
  meeting_link text,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_learner ON public.mentor_bookings(learner_id);
CREATE INDEX idx_bookings_mentor ON public.mentor_bookings(mentor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_bookings TO authenticated;
GRANT ALL ON public.mentor_bookings TO service_role;
ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learner or mentor can view booking" ON public.mentor_bookings FOR SELECT
  USING (learner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = mentor_id AND m.user_id = auth.uid()));
CREATE POLICY "Learner creates booking" ON public.mentor_bookings FOR INSERT
  WITH CHECK (learner_id = auth.uid());
CREATE POLICY "Learner or mentor updates booking" ON public.mentor_bookings FOR UPDATE
  USING (learner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = mentor_id AND m.user_id = auth.uid()));
CREATE POLICY "Learner cancels booking" ON public.mentor_bookings FOR DELETE
  USING (learner_id = auth.uid());
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.mentor_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-mark slot booked + notify mentor
CREATE OR REPLACE FUNCTION public.on_booking_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _mentor_user uuid;
  _learner_name text;
BEGIN
  UPDATE public.mentor_slots SET status = 'booked' WHERE id = NEW.slot_id;
  SELECT user_id INTO _mentor_user FROM public.mentors WHERE id = NEW.mentor_id;
  SELECT COALESCE(display_name, 'A learner') INTO _learner_name FROM public.profiles WHERE id = NEW.learner_id;
  IF _mentor_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (_mentor_user, 'booking', 'New 1:1 session booked 📅', _learner_name || ' booked: ' || NEW.topic, '/mentors');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_on_booking_created AFTER INSERT ON public.mentor_bookings
  FOR EACH ROW EXECUTE FUNCTION public.on_booking_created();

CREATE OR REPLACE FUNCTION public.on_booking_deleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.mentor_slots SET status = 'open' WHERE id = OLD.slot_id;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_on_booking_deleted AFTER DELETE ON public.mentor_bookings
  FOR EACH ROW EXECUTE FUNCTION public.on_booking_deleted();
