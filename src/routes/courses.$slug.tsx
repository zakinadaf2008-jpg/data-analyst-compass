import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, CheckCircle2, Bookmark, BookmarkCheck, Flame, NotebookPen, Save, Share2, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCourseIcon } from "@/lib/course-icons";
import { useAuth } from "@/hooks/use-auth";
import {
  useLessonProgress, useCompleteLesson, useBookmarks, useToggleBookmark,
  useLessonNote, useSaveNote,
} from "@/hooks/use-progress";

type Lesson = { id: string; title: string; duration: string; youtube_id: string; sort_order: number };
type Course = {
  id: string; slug: string; title: string; description: string; level: string;
  duration: string; icon: string; tags: string[]; sort_order: number; lessons: Lesson[];
};

const searchSchema = z.object({ lesson: z.string().optional() });

export const Route = createFileRoute("/courses/$slug")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `${titleCase(params.slug)} — Course on Analyst Hub` },
      { name: "description", content: `Free video lessons for ${titleCase(params.slug)}. Track your progress, take notes, and earn a certificate.` },
      { property: "og:title", content: `${titleCase(params.slug)} — Analyst Hub` },
      { property: "og:description", content: `Free video lessons for ${titleCase(params.slug)} on Analyst Hub.` },
    ],
    links: [{ rel: "canonical", href: `/courses/${params.slug}` }],
  }),
  component: CourseDetailPage,
});

function titleCase(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function CourseDetailPage() {
  const { slug } = Route.useParams();
  const search = useSearch({ from: "/courses/$slug" });
  const navigate = useNavigate();
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

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail", slug],
    queryFn: async (): Promise<Course | null> => {
      const { data: c } = await supabase
        .from("courses").select("*").eq("slug", slug).maybeSingle();
      if (!c) return null;
      const { data: lessons } = await supabase
        .from("lessons").select("*").eq("course_id", c.id).order("sort_order");
      return { ...(c as any), lessons: (lessons ?? []) as Lesson[] };
    },
  });

  const currentLesson: Lesson | null = useMemo(() => {
    if (!course?.lessons.length) return null;
    if (search.lesson) {
      const found = course.lessons.find((l) => l.id === search.lesson);
      if (found) return found;
    }
    return course.lessons[0];
  }, [course, search.lesson]);

  const setLesson = (id: string) => {
    navigate({ to: "/courses/$slug", params: { slug }, search: { lesson: id } });
  };

  const handleComplete = async () => {
    if (!user) return toast.error("Sign in to track progress");
    if (!course || !currentLesson || completedSet.has(currentLesson.id)) return;
    try {
      const stats: any = await completeLesson.mutateAsync({ lessonId: currentLesson.id, courseId: course.id });
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

  const handleBookmark = async () => {
    if (!user) return toast.error("Sign in to bookmark");
    if (!course) return;
    const on = !bookmarkedCourses.has(course.id);
    await toggleBookmark.mutateAsync({ kind: "course", targetId: course.id, on });
    toast.success(on ? "Bookmarked" : "Removed bookmark");
  };

  const share = async () => {
    if (!course) return;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: course.title, text: course.description, url }); return; }
      catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  if (isLoading) {
    return <AppLayout><div className="p-8 text-sm text-muted-foreground">Loading course…</div></AppLayout>;
  }
  if (!course) {
    return (
      <AppLayout>
        <div className="p-8 max-w-2xl mx-auto space-y-3">
          <h1 className="text-2xl font-bold">Course not found</h1>
          <p className="text-muted-foreground text-sm">This course doesn't exist or was removed.</p>
          <Button asChild><Link to="/courses">Back to courses</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const Icon = getCourseIcon(course.icon);
  const courseProgress = course.lessons.length
    ? Math.round((course.lessons.filter((l) => completedSet.has(l.id)).length / course.lessons.length) * 100)
    : 0;
  const isBookmarked = bookmarkedCourses.has(course.id);

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
        <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>

        <Card className="glass-card p-5 mb-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <Badge variant="outline">{course.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{course.duration} · {course.lessons.length} lessons</p>
              <p className="text-sm text-muted-foreground/90">{course.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {course.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBookmark}>
                {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                {isBookmarked ? "Saved" : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={share}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
          </div>
          {user && course.lessons.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Your progress</span><span>{courseProgress}%</span>
              </div>
              <Progress value={courseProgress} className="h-1.5" />
            </div>
          )}
        </Card>

        {currentLesson ? (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-xl overflow-hidden">
                <iframe
                  key={currentLesson.youtube_id}
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${currentLesson.youtube_id}?rel=0`}
                  title={currentLesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <Card className="glass-card p-5">
                <h2 className="text-lg font-semibold">{currentLesson.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{currentLesson.duration}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 glass-card"
                  disabled={completedSet.has(currentLesson.id) || completeLesson.isPending}
                  onClick={handleComplete}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completedSet.has(currentLesson.id) ? "Completed" : "Mark complete (+10 XP)"}
                </Button>
                {user && <LessonNotes lessonId={currentLesson.id} courseId={course.id} />}
              </Card>
            </div>
            <Card className="glass-card p-0 overflow-hidden h-fit">
              <div className="p-4 border-b border-border/50">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Lessons</p>
                <p className="font-semibold text-sm">{course.title}</p>
              </div>
              <ul className="divide-y divide-border/40 max-h-[60vh] overflow-y-auto">
                {course.lessons.map((l, i) => {
                  const isActive = l.id === currentLesson.id;
                  const isDone = completedSet.has(l.id);
                  return (
                    <li key={l.id}>
                      <button
                        onClick={() => setLesson(l.id)}
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
            </Card>
          </div>
        ) : (
          <Card className="glass-card p-8 text-center">
            <PlayCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No lessons in this course yet.</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function LessonNotes({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const { data: note } = useLessonNote(lessonId);
  const saveNote = useSaveNote();
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated !== lessonId) {
      setHydrated(lessonId);
      setDraft(note?.content ?? "");
    }
  }, [lessonId, note?.content, hydrated]);

  const dirty = draft !== (note?.content ?? "");

  const save = async () => {
    try {
      await saveNote.mutateAsync({ lessonId, courseId, content: draft });
      toast.success("Note saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save note");
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <NotebookPen className="h-3.5 w-3.5" /> My notes
        </p>
        <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={!dirty || saveNote.isPending} onClick={save}>
          <Save className="h-3 w-3" /> Save
        </Button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Jot down key takeaways, timestamps, or questions for this lesson…"
        className="w-full h-32 bg-muted/40 rounded-lg p-3 text-sm border border-border/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
