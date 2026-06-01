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
      qc.invalidateQueries({ queryKey: ["certificates", user?.id] });
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

// ---------- Notes ----------
export type Note = {
  id: string;
  lesson_id: string;
  course_id: string;
  content: string;
  updated_at: string;
};

export function useLessonNote(lessonId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["note", user?.id, lessonId],
    enabled: !!user && !!lessonId,
    queryFn: async (): Promise<Note | null> => {
      const { data } = await (supabase as any)
        .from("notes")
        .select("id, lesson_id, course_id, content, updated_at")
        .eq("user_id", user!.id)
        .eq("lesson_id", lessonId!)
        .maybeSingle();
      return data;
    },
  });
}

export function useAllNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Note[]> => {
      const { data } = await (supabase as any)
        .from("notes")
        .select("id, lesson_id, course_id, content, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return (data ?? []) as Note[];
    },
  });
}

export function useSaveNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ lessonId, courseId, content }: { lessonId: string; courseId: string; content: string }) => {
      if (!user) throw new Error("Sign in required");
      const { data: existing } = await (supabase as any)
        .from("notes")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (existing) {
        const { error } = await (supabase as any)
          .from("notes")
          .update({ content })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await (supabase as any)
          .from("notes")
          .insert({ user_id: user.id, lesson_id: lessonId, course_id: courseId, content });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["note", user?.id, v.lessonId] });
      qc.invalidateQueries({ queryKey: ["notes", user?.id] });
    },
  });
}

// ---------- Certificates ----------
export type Certificate = {
  id: string;
  course_id: string;
  issued_at: string;
};

export function useCertificates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["certificates", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Certificate[]> => {
      const { data } = await (supabase as any)
        .from("certificates")
        .select("id, course_id, issued_at")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      return (data ?? []) as Certificate[];
    },
  });
}

// ---------- Leaderboard ----------
export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  current_streak: number;
  longest_streak: number;
};

export function useLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await (supabase as any).rpc("get_leaderboard", { _limit: limit });
      if (error) throw new Error(error.message);
      return (data ?? []) as LeaderboardEntry[];
    },
  });
}
