import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, Plus, Pencil, Trash2, ListVideo, Lock, BarChart3, Users as UsersIcon, BookOpen, ShieldOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import {
  upsertCourse, deleteCourse, upsertLesson, deleteLesson,
} from "@/lib/courses.functions";
import { getAdminStats, listUsers, setUserAdmin } from "@/lib/admin.functions";
import { COURSE_ICON_NAMES, getCourseIcon } from "@/lib/course-icons";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Data Analyst Compass" }] }),
  component: AdminPage,
});

type Course = {
  id: string; slug: string; title: string; description: string;
  level: string; duration: string; icon: string; tags: string[]; sort_order: number;
};
type Lesson = {
  id: string; course_id: string; title: string; duration: string;
  youtube_id: string; sort_order: number;
};

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const upsertCourseFn = useServerFn(upsertCourse);
  const deleteCourseFn = useServerFn(deleteCourse);
  const upsertLessonFn = useServerFn(upsertLesson);
  const deleteLessonFn = useServerFn(deleteLesson);

  const [editing, setEditing] = useState<Partial<Course> | null>(null);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [lessonsFor, setLessonsFor] = useState<Course | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("sort_order");
      return (data ?? []) as Course[];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["admin-lessons", lessonsFor?.id],
    enabled: !!lessonsFor,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", lessonsFor!.id)
        .order("sort_order");
      return (data ?? []) as Lesson[];
    },
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <AppLayout><div className="p-8 text-sm text-muted-foreground">Loading…</div></AppLayout>;
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <Card className="glass-card max-w-md w-full p-8 text-center space-y-3">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold">Admin access required</h1>
            <p className="text-sm text-muted-foreground">
              Your account doesn't have admin permissions. The first user to sign up on this site
              automatically becomes admin.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const saveCourse = async () => {
    if (!editing) return;
    try {
      await upsertCourseFn({
        data: {
          ...(editing.id ? { id: editing.id } : {}),
          slug: (editing.slug || "").trim(),
          title: (editing.title || "").trim(),
          description: editing.description || "",
          level: (editing.level || "Beginner") as any,
          duration: editing.duration || "",
          icon: editing.icon || "BookOpen",
          tags: editing.tags || [],
          sort_order: editing.sort_order ?? courses.length + 1,
        } as any,
      });
      toast.success("Course saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["courses-public"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  const removeCourse = async (id: string) => {
    if (!confirm("Delete this course and all its lessons?")) return;
    await deleteCourseFn({ data: { id } });
    toast.success("Course deleted");
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["courses-public"] });
  };

  const saveLesson = async () => {
    if (!editingLesson || !lessonsFor) return;
    try {
      await upsertLessonFn({
        data: {
          ...(editingLesson.id ? { id: editingLesson.id } : {}),
          course_id: lessonsFor.id,
          title: (editingLesson.title || "").trim(),
          duration: editingLesson.duration || "",
          youtube_id: (editingLesson.youtube_id || "").trim(),
          sort_order: editingLesson.sort_order ?? lessons.length + 1,
        } as any,
      });
      toast.success("Lesson saved");
      setEditingLesson(null);
      qc.invalidateQueries({ queryKey: ["admin-lessons", lessonsFor.id] });
      qc.invalidateQueries({ queryKey: ["courses-public"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  const removeLesson = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    await deleteLessonFn({ data: { id } });
    toast.success("Lesson deleted");
    qc.invalidateQueries({ queryKey: ["admin-lessons", lessonsFor?.id] });
    qc.invalidateQueries({ queryKey: ["courses-public"] });
  };

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Admin</h1>
              <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground">Owner</Badge>
            </div>
            <p className="text-muted-foreground text-sm">Manage the catalog, users, and view platform insights.</p>
          </div>
        </div>

        <Tabs defaultValue="catalog">
          <TabsList className="glass-card mb-6">
            <TabsTrigger value="catalog"><BookOpen className="h-4 w-4" /> Catalog</TabsTrigger>
            <TabsTrigger value="users"><UsersIcon className="h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="insights"><BarChart3 className="h-4 w-4" /> Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setEditing({ level: "Beginner", icon: "BookOpen", tags: [], sort_order: courses.length + 1 })}
                className="bg-gradient-to-r from-primary to-accent"
              >
                <Plus className="h-4 w-4" /> New course
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((c) => {
                const Icon = getCourseIcon(c.icon);
                return (
                  <Card key={c.id} className="glass-card p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.level} · {c.duration}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                    <div className="flex gap-2 mt-auto">
                      <Button size="sm" variant="outline" className="glass-card flex-1" onClick={() => setLessonsFor(c)}>
                        <ListVideo className="h-3.5 w-3.5" /> Lessons
                      </Button>
                      <Button size="sm" variant="outline" className="glass-card" onClick={() => setEditing(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="glass-card text-destructive" onClick={() => removeCourse(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="users"><UsersTab currentUserId={user.id} /></TabsContent>
          <TabsContent value="insights"><InsightsTab /></TabsContent>
        </Tabs>
      </div>

      {/* Course editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit course" : "New course"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Slug</Label>
                  <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="my-course" />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Level</Label>
                  <Select value={editing.level ?? "Beginner"} onValueChange={(v) => setEditing({ ...editing, level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input value={editing.duration ?? ""} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} placeholder="12h" />
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select value={editing.icon ?? "BookOpen"} onValueChange={(v) => setEditing({ ...editing, icon: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COURSE_ICON_NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={(editing.tags ?? []).join(", ")}
                  onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveCourse} className="bg-gradient-to-r from-primary to-accent">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson manager */}
      <Dialog open={!!lessonsFor} onOpenChange={(o) => !o && setLessonsFor(null)}>
        <DialogContent className="glass-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lessons — {lessonsFor?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {lessons.map((l) => (
              <div key={l.id} className="flex items-center gap-2 p-2 rounded border border-border/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.duration} · {l.youtube_id}</p>
                </div>
                <Button size="sm" variant="outline" className="glass-card" onClick={() => setEditingLesson(l)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="glass-card text-destructive" onClick={() => removeLesson(l.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {lessons.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No lessons yet.</p>}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setEditingLesson({ course_id: lessonsFor!.id, sort_order: lessons.length + 1 })}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Plus className="h-4 w-4" /> Add lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson editor */}
      <Dialog open={!!editingLesson} onOpenChange={(o) => !o && setEditingLesson(null)}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLesson?.id ? "Edit lesson" : "New lesson"}</DialogTitle>
          </DialogHeader>
          {editingLesson && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={editingLesson.title ?? ""} onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration</Label>
                  <Input value={editingLesson.duration ?? ""} onChange={(e) => setEditingLesson({ ...editingLesson, duration: e.target.value })} placeholder="1h" />
                </div>
                <div>
                  <Label>Sort order</Label>
                  <Input type="number" value={editingLesson.sort_order ?? 0} onChange={(e) => setEditingLesson({ ...editingLesson, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <Label>YouTube video ID</Label>
                <Input value={editingLesson.youtube_id ?? ""} onChange={(e) => setEditingLesson({ ...editingLesson, youtube_id: e.target.value })} placeholder="dQw4w9WgXcQ" />
                <p className="text-xs text-muted-foreground mt-1">From a URL like youtube.com/watch?v=<b>dQw4w9WgXcQ</b></p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLesson(null)}>Cancel</Button>
            <Button onClick={saveLesson} className="bg-gradient-to-r from-primary to-accent">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function InsightsTab() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn({}) });
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const labels: Record<string, string> = {
    profiles: "Users", courses: "Courses", lessons: "Lessons",
    lesson_progress: "Lessons completed", certificates: "Certificates issued",
    showcase_projects: "Showcase projects", interview_sessions: "Interview sessions",
    mentors: "Mentors", mentor_bookings: "1:1 bookings",
    notifications: "Notifications sent", chat_threads: "AI chat threads",
  };
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Object.entries(data.counts).map(([k, v]) => (
        <Card key={k} className="glass-card p-4">
          <p className="text-xs text-muted-foreground">{labels[k] ?? k}</p>
          <p className="text-3xl font-bold gradient-text mt-1">{v}</p>
        </Card>
      ))}
      <Card className="glass-card p-4 sm:col-span-2 lg:col-span-4">
        <p className="text-sm font-semibold mb-3">Top learners by XP</p>
        <div className="space-y-2">
          {data.topXp.map((s: any, i: number) => (
            <div key={s.user_id} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-muted-foreground">#{i + 1} · {s.user_id.slice(0, 8)}</span>
              <span className="font-semibold">{s.xp} XP · 🔥 {s.current_streak}</span>
            </div>
          ))}
          {data.topXp.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const setAdminFn = useServerFn(setUserAdmin);
  const { data: users = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => listFn({}) });

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    try {
      await setAdminFn({ data: { userId, makeAdmin: !currentlyAdmin } });
      toast.success(currentlyAdmin ? "Admin removed" : "Admin granted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <Card className="glass-card overflow-hidden">
      <div className="divide-y divide-border/40">
        {users.map((u: any) => {
          const isAdmin = u.roles.includes("admin");
          const isSelf = u.id === currentUserId;
          return (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-sm font-bold">
                {(u.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {u.display_name ?? "Learner"} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{u.xp} XP · 🔥 {u.streak}</p>
              </div>
              {isAdmin && <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground">Admin</Badge>}
              <Button
                size="sm" variant="outline" className="glass-card"
                disabled={isSelf && isAdmin}
                onClick={() => toggleAdmin(u.id, isAdmin)}
              >
                {isAdmin ? <><ShieldOff className="h-3.5 w-3.5" /> Revoke</> : <><Shield className="h-3.5 w-3.5" /> Make admin</>}
              </Button>
            </div>
          );
        })}
        {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No users yet.</p>}
      </div>
    </Card>
  );
}
