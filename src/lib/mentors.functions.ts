import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMentors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: mentors, error } = await supabase
      .from("mentors")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const ids = (mentors ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const mentorIds = (mentors ?? []).map((m) => m.id);
    const { data: slots } = mentorIds.length
      ? await supabase
          .from("mentor_slots")
          .select("*")
          .in("mentor_id", mentorIds)
          .eq("status", "open")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
      : { data: [] as any[] };

    return {
      mentors: (mentors ?? []).map((m) => ({
        ...m,
        profile: profMap.get(m.user_id) ?? null,
        slots: (slots ?? []).filter((s: any) => s.mentor_id === m.id),
      })),
    };
  });

export const getMyMentorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: mentor } = await supabase
      .from("mentors").select("*").eq("user_id", userId).maybeSingle();
    if (!mentor) return { mentor: null, slots: [], bookings: [] };
    const { data: slots } = await supabase
      .from("mentor_slots").select("*").eq("mentor_id", mentor.id).order("starts_at");
    const { data: bookings } = await supabase
      .from("mentor_bookings").select("*").eq("mentor_id", mentor.id).order("created_at", { ascending: false });
    return { mentor, slots: slots ?? [], bookings: bookings ?? [] };
  });

export const upsertMentorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    headline: string; bio?: string; expertise: string[];
    hourly_rate_usd: number; timezone: string; is_active: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("mentors").select("id").eq("user_id", userId).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("mentors").update(data).eq("user_id", userId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("mentors").insert({ ...data, user_id: userId });
      if (error) throw error;
    }
    return { ok: true };
  });

export const createSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { starts_at: string; ends_at: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: mentor } = await supabase.from("mentors").select("id").eq("user_id", userId).maybeSingle();
    if (!mentor) throw new Error("Create a mentor profile first");
    const { error } = await supabase.from("mentor_slots").insert({
      mentor_id: mentor.id, starts_at: data.starts_at, ends_at: data.ends_at,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("mentor_slots").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const bookSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slot_id: string; mentor_id: string; topic: string; notes?: string; meeting_link?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("mentor_bookings").insert({
      slot_id: data.slot_id, mentor_id: data.mentor_id, learner_id: userId,
      topic: data.topic, notes: data.notes ?? null, meeting_link: data.meeting_link ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: bookings } = await supabase
      .from("mentor_bookings").select("*").eq("learner_id", userId).order("created_at", { ascending: false });
    const slotIds = (bookings ?? []).map((b) => b.slot_id);
    const mentorIds = (bookings ?? []).map((b) => b.mentor_id);
    const { data: slots } = slotIds.length
      ? await supabase.from("mentor_slots").select("*").in("id", slotIds)
      : { data: [] as any[] };
    const { data: mentors } = mentorIds.length
      ? await supabase.from("mentors").select("id, user_id, headline").in("id", mentorIds)
      : { data: [] as any[] };
    const sMap = new Map((slots ?? []).map((s: any) => [s.id, s]));
    const mMap = new Map((mentors ?? []).map((m: any) => [m.id, m]));
    return {
      bookings: (bookings ?? []).map((b) => ({
        ...b,
        slot: sMap.get(b.slot_id) ?? null,
        mentor: mMap.get(b.mentor_id) ?? null,
      })),
    };
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("mentor_bookings").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
