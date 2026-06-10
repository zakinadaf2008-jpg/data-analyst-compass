import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = [
      "profiles", "courses", "lessons", "lesson_progress", "certificates",
      "showcase_projects", "interview_sessions", "mentors", "mentor_bookings",
      "notifications", "chat_threads",
    ] as const;
    const counts: Record<string, number> = {};
    await Promise.all(
      tables.map(async (t) => {
        const { count } = await supabaseAdmin.from(t).select("*", { count: "exact", head: true });
        counts[t] = count ?? 0;
      }),
    );
    const { data: topXp } = await supabaseAdmin
      .from("user_stats").select("user_id, xp, current_streak").order("xp", { ascending: false }).limit(5);
    return { counts, topXp: topXp ?? [] };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(200);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: stats } = await supabaseAdmin.from("user_stats").select("user_id, xp, current_streak");
    const rolesMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role); rolesMap.set(r.user_id, arr);
    });
    const statsMap = new Map((stats ?? []).map((s: any) => [s.user_id, s]));
    return (profiles ?? []).map((p: any) => ({
      ...p,
      roles: rolesMap.get(p.id) ?? ["user"],
      xp: (statsMap.get(p.id) as any)?.xp ?? 0,
      streak: (statsMap.get(p.id) as any)?.current_streak ?? 0,
    }));
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; makeAdmin: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && !data.makeAdmin) {
      throw new Error("You can't remove your own admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeAdmin) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" },
      );
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    return { ok: true };
  });
