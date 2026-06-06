import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Heart, ExternalLink, Github, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "Project Showcase — Analyst Hub" },
      { name: "description", content: "Discover and share data projects built by the Analyst Hub community." },
      { property: "og:title", content: "Project Showcase — Analyst Hub" },
      { property: "og:description", content: "Discover and share data projects built by the community." },
    ],
    links: [{ rel: "canonical", href: "/showcase" }],
  }),
  component: ShowcasePage,
});

type ShowcaseProject = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  project_url: string | null;
  repo_url: string | null;
  cover_image_url: string | null;
  tags: string[];
  created_at: string;
};

type ProfileLite = { id: string; display_name: string | null; avatar_url: string | null };

function ShowcasePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["showcase-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_projects")
        .select("id,user_id,title,description,project_url,repo_url,cover_image_url,tags,created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as ShowcaseProject[];
    },
  });

  const userIds = useMemo(() => Array.from(new Set(projects.map((p) => p.user_id))), [projects]);

  const { data: profiles = {} } = useQuery({
    queryKey: ["showcase-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("id, display_name, avatar_url").in("id", userIds);
      const map: Record<string, ProfileLite> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
  });

  const { data: likes = [] } = useQuery({
    queryKey: ["showcase-likes"],
    queryFn: async () => {
      const { data } = await supabase.from("showcase_likes").select("project_id, user_id");
      return (data ?? []) as { project_id: string; user_id: string }[];
    },
  });

  const likeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    likes.forEach((l) => { m[l.project_id] = (m[l.project_id] ?? 0) + 1; });
    return m;
  }, [likes]);
  const myLikes = useMemo(
    () => new Set(likes.filter((l) => l.user_id === user?.id).map((l) => l.project_id)),
    [likes, user?.id],
  );

  const toggleLike = useMutation({
    mutationFn: async ({ projectId, on }: { projectId: string; on: boolean }) => {
      if (!user) throw new Error("Sign in to like");
      if (on) {
        const { error } = await supabase.from("showcase_likes").insert({ project_id: projectId, user_id: user.id });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("showcase_likes")
          .delete().eq("project_id", projectId).eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["showcase-likes"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("showcase_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project removed");
      qc.invalidateQueries({ queryKey: ["showcase-projects"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Project Showcase
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Real projects from the community. Get inspired, share your own.
            </p>
          </div>
          {user ? (
            <SubmitProjectDialog onCreated={() => qc.invalidateQueries({ queryKey: ["showcase-projects"] })} />
          ) : (
            <Button asChild className="bg-gradient-to-r from-primary to-accent">
              <Link to="/login">Sign in to submit</Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading projects…</p>
        ) : projects.length === 0 ? (
          <Card className="glass-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No projects yet. Be the first to share yours!</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const author = profiles[p.user_id];
              const name = author?.display_name ?? "Learner";
              const liked = myLikes.has(p.id);
              const count = likeCounts[p.id] ?? 0;
              const isMine = p.user_id === user?.id;
              return (
                <Card key={p.id} className="glass-card overflow-hidden flex flex-col">
                  {p.cover_image_url ? (
                    <div className="aspect-video bg-muted/30 overflow-hidden">
                      <img src={p.cover_image_url} alt={p.title} loading="lazy"
                        className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary/20 via-accent/10 to-transparent flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-base line-clamp-1">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3 flex-1">{p.description}</p>
                    {p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.tags.slice(0, 4).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <Avatar className="h-6 w-6">
                        {author?.avatar_url && <AvatarImage src={author.avatar_url} alt={name} />}
                        <AvatarFallback className="text-[10px]">{name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">{name}</span>
                      <button
                        onClick={() => user
                          ? toggleLike.mutate({ projectId: p.id, on: !liked })
                          : toast.error("Sign in to like")}
                        className={`ml-auto inline-flex items-center gap-1 text-xs ${liked ? "text-rose-400" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> {count}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {p.project_url && (
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <a href={p.project_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" /> Live
                          </a>
                        </Button>
                      )}
                      {p.repo_url && (
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <a href={p.repo_url} target="_blank" rel="noopener noreferrer">
                            <Github className="h-3 w-3" /> Code
                          </a>
                        </Button>
                      )}
                      {isMine && (
                        <Button size="sm" variant="ghost"
                          className="h-7 text-xs ml-auto text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm("Remove this project?")) del.mutate(p.id); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SubmitProjectDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setProjectUrl("");
    setRepoUrl(""); setCoverUrl(""); setTagsInput("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !description.trim()) return toast.error("Title and description are required");
    setSubmitting(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
      const { error } = await supabase.from("showcase_projects").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        project_url: projectUrl.trim() || null,
        repo_url: repoUrl.trim() || null,
        cover_image_url: coverUrl.trim() || null,
        tags,
      });
      if (error) throw error;
      toast.success("Project published 🎉");
      reset();
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-accent">
          <Plus className="h-4 w-4" /> Submit project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share your project</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Project title" value={title} maxLength={160}
            onChange={(e) => setTitle(e.target.value)} required />
          <textarea placeholder="What does it do? What did you learn?"
            value={description} maxLength={4000}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[120px] bg-muted/40 rounded-lg p-3 text-sm border border-border/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            required />
          <Input placeholder="Live URL (optional)" type="url" value={projectUrl}
            maxLength={500} onChange={(e) => setProjectUrl(e.target.value)} />
          <Input placeholder="Repo URL (optional)" type="url" value={repoUrl}
            maxLength={500} onChange={(e) => setRepoUrl(e.target.value)} />
          <Input placeholder="Cover image URL (optional)" type="url" value={coverUrl}
            maxLength={500} onChange={(e) => setCoverUrl(e.target.value)} />
          <Input placeholder="Tags (comma separated, e.g. Python, SQL)" value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-primary to-accent">
              {submitting ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
