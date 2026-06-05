import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, BookOpen, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search — Analyst Hub" },
      { name: "description", content: "Search across courses, lessons, and topics on Analyst Hub." },
    ],
  }),
  component: SearchPage,
});

type Course = { id: string; slug: string; title: string; description: string; level: string; tags: string[] };
type Lesson = { id: string; title: string; course_id: string };

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const term = q.trim();

  const { data, isLoading } = useQuery({
    queryKey: ["search", term],
    enabled: term.length > 0,
    queryFn: async () => {
      const pattern = `%${term}%`;
      const [coursesRes, lessonsRes] = await Promise.all([
        supabase.from("courses")
          .select("id,slug,title,description,level,tags")
          .or(`title.ilike.${pattern},description.ilike.${pattern}`)
          .limit(20),
        supabase.from("lessons")
          .select("id,title,course_id")
          .ilike("title", pattern)
          .limit(30),
      ]);
      const courses = (coursesRes.data ?? []) as Course[];
      const lessons = (lessonsRes.data ?? []) as Lesson[];
      const courseIds = Array.from(new Set(lessons.map((l) => l.course_id)));
      const lessonCoursesRes = courseIds.length
        ? await supabase.from("courses").select("id,slug,title").in("id", courseIds)
        : { data: [] };
      const courseMap = new Map((lessonCoursesRes.data ?? []).map((c: any) => [c.id, c]));
      return { courses, lessons, courseMap };
    },
  });

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <SearchIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {term ? <>Results for <span className="gradient-text">"{term}"</span></> : "Search"}
          </h1>
        </div>

        {!term ? (
          <p className="text-sm text-muted-foreground">Use the search box in the top bar to find courses, lessons, and topics.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Searching…</p>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Courses ({data?.courses.length ?? 0})
              </h2>
              {data?.courses.length === 0 ? (
                <p className="text-xs text-muted-foreground">No matching courses.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {data?.courses.map((c) => (
                    <Link
                      key={c.id}
                      to="/courses/$slug"
                      params={{ slug: c.slug }}
                      className="block"
                    >
                      <Card className="glass-card p-4 h-full hover:scale-[1.01] transition">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold">{c.title}</p>
                          <Badge variant="outline" className="text-[10px]">{c.level}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                <PlayCircle className="h-4 w-4" /> Lessons ({data?.lessons.length ?? 0})
              </h2>
              {data?.lessons.length === 0 ? (
                <p className="text-xs text-muted-foreground">No matching lessons.</p>
              ) : (
                <Card className="glass-card divide-y divide-border/40 overflow-hidden">
                  {data?.lessons.map((l) => {
                    const c = data.courseMap.get(l.course_id) as any;
                    if (!c) return null;
                    return (
                      <Link
                        key={l.id}
                        to="/courses/$slug"
                        params={{ slug: c.slug }}
                        search={{ lesson: l.id }}
                        className="block p-3 hover:bg-muted/40 transition"
                      >
                        <p className="text-sm font-medium">{l.title}</p>
                        <p className="text-xs text-muted-foreground">in {c.title}</p>
                      </Link>
                    );
                  })}
                </Card>
              )}
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
