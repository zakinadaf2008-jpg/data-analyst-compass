import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText, Output } from "ai";
import { z } from "zod";

export const listInterviewSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("interview_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });

export const getInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("interview_sessions").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: turns } = await context.supabase
      .from("interview_turns").select("*").eq("session_id", data.id).order("created_at");
    return { session, turns: turns ?? [] };
  });

async function aiChat(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    messages,
  });
  return text;
}

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { role: string; difficulty: string; topic?: string }) =>
    z.object({
      role: z.string().min(1).max(100),
      difficulty: z.enum(["easy", "medium", "hard"]),
      topic: z.string().max(200).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase
      .from("interview_sessions")
      .insert({ user_id: context.userId, role: data.role, difficulty: data.difficulty, topic: data.topic ?? null })
      .select().single();
    if (error) throw new Error(error.message);

    const systemPrompt = `You are an expert technical interviewer for a ${data.role} role at ${data.difficulty} difficulty${data.topic ? `, focused on ${data.topic}` : ""}. Ask ONE clear, focused interview question at a time. Wait for the candidate's answer before continuing. Keep questions concise (2-3 sentences max). Do not provide the answer.`;
    const firstQ = await aiChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Begin the interview with your first question." },
    ]);

    await context.supabase.from("interview_turns").insert([
      { session_id: session.id, role: "system", content: systemPrompt },
      { session_id: session.id, role: "assistant", content: firstQ },
    ]);

    return { sessionId: session.id };
  });

export const answerInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; answer: string }) =>
    z.object({ sessionId: z.string().uuid(), answer: z.string().min(1).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session } = await context.supabase
      .from("interview_sessions").select("*").eq("id", data.sessionId).single();
    if (!session || session.status !== "active") throw new Error("Session not active");

    const { data: turns } = await context.supabase
      .from("interview_turns").select("role, content").eq("session_id", data.sessionId).order("created_at");

    await context.supabase.from("interview_turns").insert({
      session_id: data.sessionId, role: "user", content: data.answer,
    });

    const history = (turns ?? []).map((t) => ({ role: t.role as "system" | "user" | "assistant", content: t.content }));
    const questionCount = history.filter((t) => t.role === "assistant").length;

    if (questionCount >= 5) {
      // Final: grade
      const gradePrompt = `Review this mock interview. Provide a score 0-100 and concise constructive feedback (3-5 bullet points).`;
      const key = process.env.LOVABLE_API_KEY!;
      const gateway = createLovableAiGatewayProvider(key);
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        messages: [
          ...history,
          { role: "user", content: data.answer },
          { role: "user", content: gradePrompt },
        ],
        output: Output.object({ schema: z.object({ score: z.number().min(0).max(100), feedback: z.string() }) }),
      });
      await context.supabase.from("interview_sessions").update({
        status: "completed", score: output.score, feedback: output.feedback,
      }).eq("id", data.sessionId);
      await context.supabase.from("interview_turns").insert({
        session_id: data.sessionId, role: "assistant",
        content: `Interview complete!\n\nScore: ${output.score}/100\n\n${output.feedback}`,
      });
      return { done: true, score: output.score, feedback: output.feedback };
    }

    const nextQ = await aiChat([
      ...history,
      { role: "user", content: data.answer },
      { role: "user", content: "Briefly acknowledge the answer (1 sentence) and ask the next interview question." },
    ]);
    await context.supabase.from("interview_turns").insert({
      session_id: data.sessionId, role: "assistant", content: nextQ,
    });
    return { done: false, question: nextQ };
  });

export const deleteInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("interview_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
