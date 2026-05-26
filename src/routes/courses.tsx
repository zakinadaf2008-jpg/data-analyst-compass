import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, PlayCircle, CheckCircle2, Bookmark, BookmarkCheck, Flame } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCourseIcon } from "@/lib/course-icons";
import { useAuth } from "@/hooks/use-auth";
import {
  useLessonProgress, useCompleteLesson, useBookmarks, useToggleBookmark,
} from "@/hooks/use-progress";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — Learn SQL, Python, Excel and More" },
      { name: "description", content: "Beginner to advanced data analyst courses on Excel, SQL, Python, visualization and ML with free video lessons." },
    ],
    links: [{ rel: "canonical", href: "/courses" }],
  }),
  component: CoursesPage,
});

type Lesson = { id: string; title: string; duration: string; youtube_id: string; sort_order: number };
type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  icon: string;
  tags: string[];
  sort_order: number;
  lessons: Lesson[];
};

const levels = ["All", "Beginner", "Intermediate", "Advanced"];

function CoursesPage() {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);

  const { user } = useAuth();
  const { data: progress = [] } = useLessonProgress();
  const { data: bookmarks = [] } = useBookmarks();
  const completeLesson = useCompleteLesson();
  const toggleBookmark = useToggleBookmark();

  const completedSet = useMemo(() => new Set(progress.map((p) => p.lesson_id)), [progress]);
  const bookmarkedCourses = useMemo(
    () => new Set(bookmarks.filter((b) => b.kind === "course").map((b) => b.target_id)),
    [bookmarks],
  );

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses-public"],
    queryFn: async (): Promise<Course[]> => {
      const { data: courseRows } = await supabase
        .from("courses")
        .select("*")
        .order("sort_order");
      const { data: lessonRows } = await supabase
        .from("lessons")
        .select("*")
        .order("sort_order");
      return (courseRows ?? []).map((c: any) => ({
        ...c,
        lessons: (lessonRows ?? []).filter((l: any) => l.course_id === c.id),
      }));
    },
  });

  const filtered = courses.filter(
    (c) =>
      (filter === "All" || c.level === filter) &&
      c.title.toLowerCase().includes(q.toLowerCase()),
  );

  const openCourse = (c: Course) => {
    setActive(c);
    setCurrentLesson(c.lessons[0] ?? null);
  };

  const handleComplete = async (courseId: string, lessonId: string) => {
    if (!user) {
      toast.error("Sign in to track progress");
      return;
    }
    if (completedSet.has(lessonId)) return;
    try {
      const stats: any = await completeLesson.mutateAsync({ lessonId, courseId });
      toast.success(
        <span className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          +10 XP · {stats?.current_streak ?? 1} day streak
        </span> as any,
      );
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  const handleBookmark = async (courseId: string) => {
    if (!user) {
      toast.error("Sign in to bookmark");
      return;
    }
    const on = !bookmarkedCourses.has(courseId);
    await toggleBookmark.mutateAsync({ kind: "course", targetId: courseId, on });
    toast.success(on ? "Bookmarked" : "Removed bookmark");
  };

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course catalog</h1>
          <p className="text-muted-foreground text-sm">{courses.length} courses · watch &amp; learn from curated free video lessons</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses..."
              className="pl-9 bg-muted/40"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {levels.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={filter === l ? "default" : "outline"}
                onClick={() => setFilter(l)}
                className={filter === l ? "bg-gradient-to-r from-primary to-accent" : "glass-card"}
              >
                {l}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading catalog…</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const Icon = getCourseIcon(c.icon);
              const courseProgress = c.lessons.length
                ? Math.round(
                    (c.lessons.filter((l) => completedSet.has(l.id)).length / c.lessons.length) *
                      100,
                  )
                : 0;
              const isBookmarked = bookmarkedCourses.has(c.id);
              return (
                <Card key={c.id} className="glass-card p-5 flex flex-col hover:scale-[1.02] transition-transform">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{c.level}</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleBookmark(c.id); }}
                        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
                      >
                        {isBookmarked
                          ? <BookmarkCheck className="h-4 w-4 text-primary" />
                          : <Bookmark className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{c.duration} · {c.lessons.length} lessons</p>
                  <p className="text-sm text-muted-foreground/80 mb-3 line-clamp-2">{c.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.tags.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{t}</span>
                    ))}
                  </div>
                  {user && c.lessons.length > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Progress</span><span>{courseProgress}%</span>
                      </div>
                      <Progress value={courseProgress} className="h-1.5" />
                    </div>
                  )}
                  <Button
                    onClick={() => openCourse(c)}
                    disabled={c.lessons.length === 0}
                    className="mt-auto w-full bg-gradient-to-r from-primary to-accent"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {c.lessons.length === 0 ? "No lessons yet" : courseProgress > 0 ? "Continue" : "Start Learning"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-5xl glass-card border-border/50 p-0 overflow-hidden">
          {active && currentLesson && (
            <div className="grid md:grid-cols-[1fr_280px] max-h-[85vh]">
              <div className="flex flex-col min-w-0">
                <div className="aspect-video bg-black w-full">
                  <iframe
                    key={currentLesson.youtube_id}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${currentLesson.youtube_id}?rel=0`}
                    title={currentLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-5 border-t border-border/50">
                  <DialogHeader>
                    <DialogTitle className="text-lg">{currentLesson.title}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground mt-2">
                    From <span className="text-foreground font-medium">{active.title}</span> · {currentLesson.duration}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 glass-card"
                    disabled={completedSet.has(currentLesson.id) || completeLesson.isPending}
                    onClick={() => handleComplete(active.id, currentLesson.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completedSet.has(currentLesson.id) ? "Completed" : "Mark complete (+10 XP)"}
                  </Button>
                </div>
              </div>
              <div className="border-l border-border/50 bg-muted/20 overflow-y-auto">
                <div className="p-4 border-b border-border/50">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Lessons</p>
                  <p className="font-semibold text-sm">{active.title}</p>
                </div>
                <ul className="divide-y divide-border/40">
                  {active.lessons.map((l, i) => {
                    const isActive = l.id === currentLesson.id;
                    const isDone = completedSet.has(l.id);
                    return (
                      <li key={l.id}>
                        <button
                          onClick={() => setCurrentLesson(l)}
                          className={`w-full text-left p-3 flex gap-3 items-start hover:bg-muted/40 transition ${isActive ? "bg-primary/10" : ""}`}
                        >
                          <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium ${isActive ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : isDone ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                            {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{l.title}</p>
                            <p className="text-xs text-muted-foreground">{l.duration}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
