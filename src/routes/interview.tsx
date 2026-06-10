import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listInterviewSessions, getInterviewSession, startInterview, answerInterview, deleteInterviewSession,
} from "@/lib/interview.functions";
import { Brain, Loader2, Trash2, Send, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/interview")({ component: InterviewPage });

function InterviewPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const list = useServerFn(listInterviewSessions);
  const del = useServerFn(deleteInterviewSession);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["interviews"], queryFn: () => list({ data: undefined as never }) });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["interviews"] }); setActiveId(null); },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold gradient-text">Interview Prep Arena</h1>
            <p className="text-sm text-muted-foreground">AI-powered mock interviews with instant feedback</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <NewInterviewCard onCreated={(id) => { qc.invalidateQueries({ queryKey: ["interviews"] }); setActiveId(id); }} />
            <Card>
              <CardHeader><CardTitle className="text-sm">Past sessions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {data?.sessions.length === 0 && <p className="text-xs text-muted-foreground">No sessions yet.</p>}
                {data?.sessions.map((s) => (
                  <div key={s.id}
                    className={`p-2 rounded-md border cursor-pointer hover:bg-accent/30 ${activeId === s.id ? "bg-accent/40 border-primary" : ""}`}
                    onClick={() => setActiveId(s.id)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.role}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={s.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                          {s.status === "completed" ? `${s.score}/100` : s.difficulty}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); delMut.mutate(s.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            {activeId ? <SessionView sessionId={activeId} /> : (
              <Card><CardContent className="p-12 text-center text-muted-foreground">
                Start a new interview or select one from your history.
              </CardContent></Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function NewInterviewCard({ onCreated }: { onCreated: (id: string) => void }) {
  const start = useServerFn(startInterview);
  const [role, setRole] = useState("Data Analyst");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [topic, setTopic] = useState("");

  const mut = useMutation({
    mutationFn: () => start({ data: { role, difficulty, topic: topic || undefined } }),
    onSuccess: (r) => { toast.success("Interview started"); onCreated(r.sessionId); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> New interview</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1"><Label className="text-xs">Role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Difficulty</Label>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Topic (optional)</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. SQL, Python, statistics" /></div>
        <Button className="w-full" disabled={mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start interview"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SessionView({ sessionId }: { sessionId: string }) {
  const get = useServerFn(getInterviewSession);
  const answer = useServerFn(answerInterview);
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["interview", sessionId],
    queryFn: () => get({ data: { id: sessionId } }),
  });

  const mut = useMutation({
    mutationFn: () => answer({ data: { sessionId, answer: draft.trim() } }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["interview", sessionId] });
      qc.invalidateQueries({ queryKey: ["interviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <Card><CardContent className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;
  const done = data.session.status === "completed";
  const turns = data.turns.filter((t) => t.role !== "system");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{data.session.role}</span>
          <Badge variant={done ? "default" : "secondary"}>
            {done ? `Score: ${data.session.score}/100` : data.session.difficulty}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {turns.map((t) => (
            <div key={t.id} className={`p-3 rounded-lg ${t.role === "assistant" ? "bg-accent/30" : "bg-primary/10 ml-8"}`}>
              <p className="text-xs font-semibold mb-1 text-muted-foreground">
                {t.role === "assistant" ? "Interviewer" : "You"}
              </p>
              <p className="text-sm whitespace-pre-wrap">{t.content}</p>
            </div>
          ))}
        </div>
        {!done && (
          <div className="space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4}
              placeholder="Type your answer..." disabled={mut.isPending} />
            <Button className="w-full" disabled={!draft.trim() || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Submit answer</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
