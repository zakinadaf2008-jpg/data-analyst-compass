import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Calculator, Sheet, Database, Code2, BarChart3, Brain, Server, GitBranch, Search,
} from "lucide-react";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — Learn SQL, Python, Excel and More" },
      { name: "description", content: "Beginner to advanced data analyst courses on Excel, SQL, Python, visualization and ML." },
    ],
    links: [{ rel: "canonical", href: "/courses" }],
  }),
  component: CoursesPage,
});

const categories = [
  { icon: Calculator, title: "Mathematics & Statistics", level: "Beginner", duration: "20h", tags: ["Probability", "Regression", "Hypothesis"], progress: 40 },
  { icon: Sheet, title: "Excel", level: "Beginner", duration: "12h", tags: ["Pivots", "Power Query", "Formulas"], progress: 85 },
  { icon: Database, title: "SQL", level: "Beginner", duration: "18h", tags: ["Joins", "Windows", "Subqueries"], progress: 70 },
  { icon: Code2, title: "Python", level: "Intermediate", duration: "30h", tags: ["Pandas", "NumPy", "EDA"], progress: 55 },
  { icon: BarChart3, title: "Visualization", level: "Intermediate", duration: "16h", tags: ["Tableau", "Power BI", "Plotly"], progress: 30 },
  { icon: Brain, title: "Machine Learning", level: "Advanced", duration: "40h", tags: ["Sklearn", "Models", "Tuning"], progress: 10 },
  { icon: Server, title: "Big Data", level: "Advanced", duration: "24h", tags: ["Spark", "Hadoop", "Cloud"], progress: 0 },
  { icon: GitBranch, title: "Git & GitHub", level: "Beginner", duration: "6h", tags: ["Branching", "Workflow"], progress: 90 },
];

const levels = ["All", "Beginner", "Intermediate", "Advanced"];

function CoursesPage() {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const filtered = categories.filter(c =>
    (filter === "All" || c.level === filter) &&
    c.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course catalog</h1>
          <p className="text-muted-foreground text-sm">8 categories · structured learning by skill</p>
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
          <div className="flex gap-2">
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.title} className="glass-card p-5 flex flex-col hover:scale-[1.02] transition-transform">
              <div className="flex items-start justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <c.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <Badge variant="outline">{c.level}</Badge>
              </div>
              <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">{c.duration} estimated</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {c.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{t}</span>
                ))}
              </div>
              <div className="mt-auto space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{c.progress}%</span>
                  </div>
                  <Progress value={c.progress} />
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-accent">
                  {c.progress > 0 ? "Continue" : "Start Learning"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
