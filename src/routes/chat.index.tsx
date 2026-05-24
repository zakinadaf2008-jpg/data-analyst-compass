import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/chat/")({
  component: () => (
    <div className="flex flex-col items-center justify-center text-center px-6">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 animate-pulse-glow">
        <Sparkles className="h-8 w-8 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-2 gradient-text">Ask your AI tutor</h2>
      <p className="text-muted-foreground max-w-md">
        Start a new chat to get help with SQL, Python, Excel, statistics, or any data analysis question.
      </p>
    </div>
  ),
});
