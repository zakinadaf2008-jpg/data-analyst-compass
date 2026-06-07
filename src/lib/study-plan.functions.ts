import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateObject } from "ai";

function mondayOf(date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

const PlanSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(3).max(140),
        detail: z.string().max(400).optional(),
        course_slug: z.string().max(80).optional(),
      }),
    )
    .min(3)
    .max(7),
});

export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");

    const weekStart = mondayOf();

    // Gather learner context
    const [{ data: stats }, { data: prof }, { data: progress }, { data: courses }] = await Promise.all([
      supabase.from("user_stats").select("xp,current_streak,longest_streak").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      supabase
        .from("lesson_progress")
        .select("course_id,completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(30),
      supabase.from("courses").select("slug,title,description,level").limit(40),
    ]);

    const doneCourseIds = new Set((progress ?? []).map((p) => p.course_id));
    const catalog = (courses ?? []).map(
      (c) => `- ${c.slug} | ${c.title} (${c.level ?? "n/a"}) — ${c.description ?? ""}`,
    ).join("\n");

    const prompt = `Learner: ${prof?.display_name ?? "Learner"}
XP: ${stats?.xp ?? 0}, current streak: ${stats?.current_streak ?? 0} days
Lessons completed (last 30): ${progress?.length ?? 0}
Courses they've touched: ${[...doneCourseIds].slice(0, 10).join(", ") || "none"}

Course catalog (slug | title (level) — description):
${catalog || "(empty)"}

Build a focused weekly study plan for this data analyst learner: 4–6 actionable tasks for the week starting ${weekStart}. Mix practice, theory, and one stretch goal. Reference course slugs when relevant.`;

    const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
    const { object } = await generateObject({
      model: gateway("google/gemini-2.5-flash"),
      schema: PlanSchema,
      system:
        "You are an expert data analytics learning coach. Produce a concise, motivating weekly study plan. Be specific and reference real course slugs from the catalog when sensible.",
      prompt,
    });

    // Replace any existing tasks for this week
    await supabase.from("study_tasks").delete().eq("user_id", userId).eq("week_start", weekStart);

    const rows = object.tasks.map((t, i) => ({
      user_id: userId,
      week_start: weekStart,
      title: t.title,
      detail: t.detail ?? null,
      course_slug: t.course_slug ?? null,
      position: i,
    }));
    const { error } = await supabase.from("study_tasks").insert(rows);
    if (error) throw new Error(error.message);
    return { weekStart, count: rows.length };
  });

export const getCurrentWeekTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const weekStart = mondayOf();
    const { data, error } = await supabase
      .from("study_tasks")
      .select("id,title,detail,course_slug,done,position,week_start")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return { weekStart, tasks: data ?? [] };
  });

export const toggleStudyTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), done: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("study_tasks")
      .update({ done: data.done })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
