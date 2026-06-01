import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Flame, Medal } from "lucide-react";
import { useLeaderboard } from "@/hooks/use-progress";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Top Learners on Analyst Hub" },
      { name: "description", content: "See the top data analyst learners ranked by XP and streaks. Climb the ranks by completing lessons every day." },
    ],
    links: [{ rel: "canonical", href: "/leaderboard" }],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = useAuth();
  const { data: entries = [], isLoading } = useLeaderboard(50);

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-7 w-7 text-yellow-400" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Top learners by XP. Complete lessons to climb the ranks.</p>
          </div>
          <Badge variant="outline">{entries.length} ranked</Badge>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading rankings…</p>
        ) : entries.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No one has earned XP yet. Be the first!</p>
          </Card>
        ) : (
          <Card className="glass-card divide-y divide-border/40 overflow-hidden">
            {entries.map((e, i) => {
              const rank = i + 1;
              const isMe = user?.id === e.user_id;
              const medal = rank === 1 ? "text-yellow-400" : rank === 2 ? "text-slate-300" : rank === 3 ? "text-amber-600" : "";
              return (
                <div
                  key={e.user_id}
                  className={`flex items-center gap-4 p-4 ${isMe ? "bg-primary/10" : ""}`}
                >
                  <div className={`w-8 text-center font-bold ${medal}`}>
                    {rank <= 3 ? <Medal className="h-5 w-5 mx-auto" /> : `#${rank}`}
                  </div>
                  <Avatar className="h-10 w-10">
                    {e.avatar_url && <AvatarImage src={e.avatar_url} alt={e.display_name} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                      {e.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {e.display_name}
                      {isMe && <span className="ml-2 text-xs text-primary">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Flame className="h-3 w-3 text-orange-400" />
                      {e.current_streak} day streak · best {e.longest_streak}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg gradient-text">{e.xp}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">XP</div>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
