import { createFileRoute, Outlet, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, MessageSquare, Trash2, Lock, LogIn } from "lucide-react";
import { listThreads, createThread, deleteThread } from "@/lib/chat.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "AI Tutor — Data Analyst Compass" }] }),
  component: ChatLayout,
});

function ChatLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const fetchThreads = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    enabled: !!user,
    queryFn: () => fetchThreads(),
  });

  if (loading) {
    return <AppLayout><div className="p-8 text-sm text-muted-foreground">Loading…</div></AppLayout>;
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <Card className="glass-card max-w-md w-full p-8 text-center space-y-4">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Sign in to use AI Tutor</h1>
            <p className="text-sm text-muted-foreground">
              Your chat threads are saved to your account so you can pick up conversations from any device.
              The rest of the site (Roadmap, Courses, Resources…) is free to browse without signing in.
            </p>
            <Button
              onClick={() => navigate({ to: "/login" })}
              className="w-full bg-gradient-to-r from-primary to-accent"
            >
              <LogIn className="h-4 w-4" /> Sign in or create account
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const newChat = async () => {
    const t = await createFn();
    qc.invalidateQueries({ queryKey: ["threads"] });
    navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
  };

  const remove = async (id: string) => {
    await deleteFn({ data: { threadId: id } });
    qc.invalidateQueries({ queryKey: ["threads"] });
    if (params.threadId === id) navigate({ to: "/chat" });
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-[260px_1fr] h-[calc(100vh-3.5rem)]">
        <aside className="border-r border-border/50 bg-muted/20 flex flex-col">
          <div className="p-3 border-b border-border/50">
            <Button onClick={newChat} className="w-full bg-gradient-to-r from-primary to-accent">
              <Plus className="h-4 w-4" /> New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {threads.length === 0 && (
              <p className="text-xs text-muted-foreground p-3">No conversations yet.</p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/40 ${params.threadId === t.id ? "bg-primary/10" : ""}`}
              >
                <Link
                  to="/chat/$threadId"
                  params={{ threadId: t.id }}
                  className="flex-1 flex items-center gap-2 min-w-0"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{t.title}</span>
                </Link>
                <button
                  onClick={() => remove(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>
        <Outlet />
      </div>
    </AppLayout>
  );
}
