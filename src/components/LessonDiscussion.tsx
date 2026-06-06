import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
};

export function LessonDiscussion({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["lesson-comments", lessonId],
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from("lesson_comments")
        .select("id, user_id, body, created_at")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Comment[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, display_name, avatar_url").in("id", ids);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        rows.forEach((r) => { r.profile = map.get(r.user_id) ?? null; });
      }
      return rows;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`lesson-comments-${lessonId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "lesson_comments", filter: `lesson_id=eq.${lessonId}` },
        () => qc.invalidateQueries({ queryKey: ["lesson-comments", lessonId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [lessonId, qc]);

  const post = useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error("Sign in to comment");
      const { error } = await supabase.from("lesson_comments").insert({
        user_id: user.id, lesson_id: lessonId, course_id: courseId, body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to post"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson-comments", lessonId] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Discussion {comments.length > 0 && `· ${comments.length}`}
        </p>
      </div>

      {user ? (
        <form
          className="flex gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            const v = draft.trim();
            if (!v) return;
            post.mutate(v);
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share a thought, ask a question…"
            maxLength={4000}
            className="flex-1 bg-muted/40 rounded-lg p-3 text-sm border border-border/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[64px]"
          />
          <Button type="submit" size="sm" disabled={!draft.trim() || post.isPending} className="self-end">
            <Send className="h-4 w-4" /> Post
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground mb-4">Sign in to join the discussion.</p>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Be the first to start the conversation.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const name = c.profile?.display_name ?? "Learner";
            const initial = name.charAt(0).toUpperCase();
            const mine = c.user_id === user?.id;
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {c.profile?.avatar_url && <AvatarImage src={c.profile.avatar_url} alt={name} />}
                  <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                    {mine && (
                      <button
                        onClick={() => del.mutate(c.id)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
