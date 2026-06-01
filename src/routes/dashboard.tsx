import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame, Target, BookOpen, Trophy, TrendingUp, BookMarked, Award, NotebookPen,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useUserStats, useLessonProgress, useBookmarks, useCertificates, useAllNotes } from "@/hooks/use-progress";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Data Analyst Roadmap Hub" },
      { name: "description", content: "Track your learning progress, streak, and goals on your analyst journey." },
    ],
    links: [{ rel: "canonical", href: "/dashboard" }],
  }),
  component: DashboardPage,
});

const skills = [
  { name: "SQL", v: 78 }, { name: "Python", v: 62 }, { name: "Excel", v: 90 },
  { name: "Stats", v: 55 }, { name: "Viz", v: 45 }, { name: "ML", v: 22 },
];

function DashboardPage() {
  const { user } = useAuth();
  const { data: stats } = useUserStats();
  const { data: progress = [] } = useLessonProgress();
  const { data: bookmarks = [] } = useBookmarks();
  const { data: certificates = [] } = useCertificates();
  const { data: notes = [] } = useAllNotes();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Learner";
  const streak = stats?.current_streak ?? 0;
  const xp = stats?.xp ?? 0;
  const lessonsDone = progress.length;
  const bookmarkCount = bookmarks.length;

  const weekly = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const buckets: { day: string; lessons: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = progress.filter((p) => p.completed_at.slice(0, 10) === key).length;
      buckets.push({ day: days[d.getDay()], lessons: count });
    }
    return buckets;
  }, [progress]);

  return (
    <AppLayout>
      <div className="px-6 py-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {displayName}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {user
                ? `You've earned ${xp} XP. Keep the streak alive!`
                : "Sign in to track your progress, XP, and streak."}
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-primary to-accent">
            <Link to="/courses"><BookOpen className="mr-2 h-4 w-4" /> Continue learning</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Flame, label: "Current streak", value: `${streak} ${streak === 1 ? "day" : "days"}`, color: "from-orange-500 to-red-500" },
            { icon: BookOpen, label: "Lessons done", value: String(lessonsDone), color: "from-primary to-accent" },
            { icon: Trophy, label: "XP earned", value: String(xp), color: "from-yellow-500 to-amber-500" },
            { icon: BookMarked, label: "Bookmarks", value: String(bookmarkCount), color: "from-cyan-500 to-blue-500" },
          ].map((k) => (
            <Card key={k.label} className="glass-card p-5">
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${k.color} flex items-center justify-center mb-3`}>
                <k.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-2xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Weekly chart */}
          <Card className="glass-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Weekly activity</h2>
                <p className="text-xs text-muted-foreground">Lessons completed · last 7 days</p>
              </div>
              <Badge variant="outline" className="text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                <TrendingUp className="h-3 w-3 mr-1" /> {weekly.reduce((s, d) => s + d.lessons, 0)} total
              </Badge>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.65 0.21 275)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="oklch(0.65 0.21 275)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis dataKey="day" stroke="oklch(0.7 0.03 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.03 260)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.035 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="lessons" stroke="oklch(0.65 0.21 275)" fill="url(#g1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Goal */}
          <Card className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Today's goal</h2>
            </div>
            {(() => {
              const todayKey = new Date().toISOString().slice(0, 10);
              const doneToday = progress.filter((p) => p.completed_at.slice(0, 10) === todayKey).length;
              const goal = 3;
              const pct = Math.min(100, Math.round((doneToday / goal) * 100));
              return (
                <>
                  <div className="text-3xl font-bold gradient-text mb-2">{doneToday} / {goal}</div>
                  <p className="text-xs text-muted-foreground mb-4">Lessons completed today</p>
                  <Progress value={pct} className="mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {doneToday >= goal ? "🎉 Goal reached!" : `${goal - doneToday} more to hit today's goal`}
                  </p>
                </>
              );
            })()}
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Skills */}
          <Card className="glass-card p-5 lg:col-span-2">
            <h2 className="font-semibold mb-4">Skill progress</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skills}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
                  <XAxis dataKey="name" stroke="oklch(0.7 0.03 260)" fontSize={12} />
                  <YAxis stroke="oklch(0.7 0.03 260)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.035 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                  <Bar dataKey="v" fill="oklch(0.65 0.21 275)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Notes */}
          <Card className="glass-card p-5">
            <h2 className="font-semibold mb-3">Quick notes</h2>
            <textarea
              defaultValue="Review window functions tomorrow. Try LEAD/LAG on sales dataset."
              className="w-full h-40 bg-muted/40 rounded-lg p-3 text-sm border border-border/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="glass-card p-5">
            <h2 className="font-semibold mb-4">Recently completed</h2>
            <div className="space-y-3">
              {progress.length === 0 && (
                <p className="text-sm text-muted-foreground">No lessons completed yet. <Link to="/courses" className="text-primary hover:underline">Start a course →</Link></p>
              )}
              {progress
                .slice()
                .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
                .slice(0, 5)
                .map((p) => (
                  <div key={p.lesson_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="text-sm font-medium">Lesson completed</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.completed_at).toLocaleString()}</div>
                    </div>
                    <Badge variant="outline" className="text-emerald-300 border-emerald-500/30 bg-emerald-500/10">+10 XP</Badge>
                  </div>
                ))}
            </div>
          </Card>
          <Card className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Bookmarks</h2>
              <Badge variant="outline">{bookmarkCount}</Badge>
            </div>
            <div className="space-y-3">
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookmarks yet. Save courses from the <Link to="/courses" className="text-primary hover:underline">catalog</Link>.</p>
              ) : (
                bookmarks.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="text-sm font-medium capitalize">{b.kind}</div>
                    <Badge variant="outline">{new Date(b.created_at).toLocaleDateString()}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
