import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type UserStats = {
  user_id: string;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

export function useUserStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-stats", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserStats | null> => {
      const { data } = await (supabase as any)
        .from("user_stats")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });
}

export function useLessonProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lesson-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lesson_progress")
        .select("lesson_id, course_id, completed_at")
        .eq("user_id", user!.id);
      return (data ?? []) as { lesson_id: string; course_id: string; completed_at: string }[];
    },
  });
}

export function useCompleteLesson() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ lessonId, courseId }: { lessonId: string; courseId: string }) => {
      const { data, error } = await (supabase as any).rpc("complete_lesson", {
        _lesson_id: lessonId,
        _course_id: courseId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-progress", user?.id] });
      qc.invalidateQueries({ queryKey: ["user-stats", user?.id] });
    },
  });
}

export function useBookmarks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("bookmarks")
        .select("id, kind, target_id, created_at")
        .eq("user_id", user!.id);
      return (data ?? []) as { id: string; kind: "course" | "lesson"; target_id: string; created_at: string }[];
    },
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      kind,
      targetId,
      on,
    }: {
      kind: "course" | "lesson";
      targetId: string;
      on: boolean;
    }) => {
      if (!user) throw new Error("Sign in required");
      if (on) {
        const { error } = await (supabase as any)
          .from("bookmarks")
          .insert({ user_id: user.id, kind, target_id: targetId });
        if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
      } else {
        const { error } = await (supabase as any)
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("kind", kind)
          .eq("target_id", targetId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks", user?.id] }),
  });
}
