import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [allRes, ownedRes, statsRes, certsRes, showcaseRes] = await Promise.all([
      supabase.from("achievements").select("*").order("threshold", { ascending: true }),
      supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
      supabase.from("user_stats").select("xp, current_streak, longest_streak").eq("user_id", userId).maybeSingle(),
      supabase.from("certificates").select("id").eq("user_id", userId),
      supabase.from("showcase_projects").select("id").eq("user_id", userId).eq("published", true),
    ]);

    const all = allRes.data ?? [];
    const owned = new Map((ownedRes.data ?? []).map((r) => [r.achievement_id, r.earned_at]));
    const stats = statsRes.data ?? { xp: 0, current_streak: 0, longest_streak: 0 };
    const certCount = certsRes.data?.length ?? 0;
    const showcaseCount = showcaseRes.data?.length ?? 0;

    const toInsert: { user_id: string; achievement_id: string }[] = [];
    for (const a of all) {
      if (owned.has(a.id)) continue;
      let unlocked = false;
      if (a.criteria_type === "xp") unlocked = stats.xp >= a.threshold;
      else if (a.criteria_type === "streak") unlocked = stats.longest_streak >= a.threshold;
      else if (a.criteria_type === "certificates") unlocked = certCount >= a.threshold;
      else if (a.criteria_type === "showcase") unlocked = showcaseCount >= a.threshold;
      if (unlocked) toInsert.push({ user_id: userId, achievement_id: a.id });
    }
    if (toInsert.length) {
      await supabase.from("user_achievements").insert(toInsert);
      for (const row of toInsert) owned.set(row.achievement_id, new Date().toISOString());
    }

    return {
      achievements: all.map((a) => ({
        ...a,
        earned_at: owned.get(a.id) ?? null,
        progress:
          a.criteria_type === "xp" ? Math.min(1, stats.xp / a.threshold)
          : a.criteria_type === "streak" ? Math.min(1, stats.longest_streak / a.threshold)
          : a.criteria_type === "certificates" ? Math.min(1, certCount / a.threshold)
          : a.criteria_type === "showcase" ? Math.min(1, showcaseCount / a.threshold)
          : 0,
      })),
      stats: { xp: stats.xp, longest_streak: stats.longest_streak, certCount, showcaseCount },
    };
  });

export const getMyCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: certs } = await supabase
      .from("certificates")
      .select("id, course_id, issued_at")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });
    const courseIds = (certs ?? []).map((c) => c.course_id);
    const { data: courses } = courseIds.length
      ? await supabase.from("courses").select("id, title, slug").in("id", courseIds)
      : { data: [] };
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));
    return {
      learnerName: profile?.display_name ?? "Learner",
      certificates: (certs ?? []).map((c) => ({
        id: c.id,
        issued_at: c.issued_at,
        course: courseMap.get(c.course_id) ?? null,
      })),
    };
  });
