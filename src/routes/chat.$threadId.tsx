import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getThreadMessages } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$threadId")({
  component: ChatThread,
});

type Msg = { id: string; role: string; content: string };

function ChatThread() {
  const { threadId } = useParams({ from: "/chat/$threadId" });
  const qc = useQueryClient();
  const fetchMessages = useServerFn(getThreadMessages);
  const { data: serverMessages = [] } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => fetchMessages({ data: { threadId } }),
  });

  const [streaming, setStreaming] = useState("");
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const messages: Msg[] = [
    ...(serverMessages as Msg[]),
    ...(pendingUser ? [{ id: "p-u", role: "user", content: pendingUser }] : []),
    ...(streaming ? [{ id: "p-a", role: "assistant", content: streaming }] : []),
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streaming]);

  useEffect(() => {
    taRef.current?.focus();
  }, [threadId, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    setPendingUser(text);
    setStreaming("");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast.error("Please sign in again");
      setLoading(false);
      setPendingUser(null);
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ threadId, message: text }),
      });
      if (!res.ok || !res.body) {
        if (res.status === 429) toast.error("Rate limit reached. Try again shortly.");
        else if (res.status === 402) toast.error("AI credits exhausted. Add credits in Settings.");
        else toast.error("Chat failed");
        setLoading(false);
        setPendingUser(null);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setLoading(false);
      setStreaming("");
      setPendingUser(null);
      qc.invalidateQueries({ queryKey: ["messages", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-12">
            Ask anything about data analysis — SQL, Python, Excel, stats, ML, careers.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[85%] prose prose-sm prose-invert text-foreground">
                <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border/50 p-3 md:p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about data analysis..."
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={loading || !input.trim()} className="self-end bg-gradient-to-r from-primary to-accent">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
