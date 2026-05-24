import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";
import { streamText } from "ai";
import { z } from "zod";

const Body = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(8000),
});

const SYSTEM = `You are the Data Analyst Compass AI tutor. Help learners understand data analysis: SQL, Python (pandas, numpy), Excel, statistics, visualization (Tableau/Power BI), machine learning basics, and career advice. Be concise, friendly, and use markdown with code blocks when helpful.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7);

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!LOVABLE_API_KEY) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claimData, error: claimErr } = await supabase.auth.getClaims(token);
        if (claimErr || !claimData?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claimData.claims.sub;

        const parsed = Body.safeParse(await request.json());
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { threadId, message } = parsed.data;

        // Save user message
        await supabase.from("chat_messages").insert({
          thread_id: threadId,
          user_id: userId,
          role: "user",
          content: message,
        });

        // Fetch history
        const { data: history } = await supabase
          .from("chat_messages")
          .select("role,content")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true });

        const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM,
          messages: (history ?? []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          onFinish: async ({ text }) => {
            await supabase.from("chat_messages").insert({
              thread_id: threadId,
              user_id: userId,
              role: "assistant",
              content: text,
            });
            // bump thread + set title if first message
            const title = message.slice(0, 60);
            await supabase
              .from("chat_threads")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", threadId)
              .eq("user_id", userId);
            const { count } = await supabase
              .from("chat_messages")
              .select("id", { count: "exact", head: true })
              .eq("thread_id", threadId);
            if ((count ?? 0) <= 2) {
              await supabase
                .from("chat_threads")
                .update({ title })
                .eq("id", threadId)
                .eq("user_id", userId);
            }
          },
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
