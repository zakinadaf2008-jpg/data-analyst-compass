import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Data Analyst Roadmap — Step-by-Step Learning Path" },
      { name: "description", content: "Interactive 9-stage roadmap from math foundations to ML and big data. Become a data analyst with a structured guide." },
      { property: "og:title", content: "Data Analyst Roadmap" },
      { property: "og:description", content: "Complete step-by-step path to becoming a data analyst." },
    ],
    links: [{ rel: "canonical", href: "/roadmap" }],
  }),
  component: RoadmapPage,
});

const stages = [
  { n: 1, title: "Foundations", duration: "3-4 weeks", level: "Beginner",
    topics: ["Mean, median, mode", "Probability", "Distributions", "Correlation", "Regression basics", "Hypothesis testing", "Data literacy"] },
  { n: 2, title: "Excel", duration: "2-3 weeks", level: "Beginner",
    topics: ["Excel basics", "Functions & formulas", "Pivot tables", "Data cleaning", "Dashboards", "Power Query", "Automation"] },
  { n: 3, title: "SQL", duration: "4 weeks", level: "Beginner",
    topics: ["SELECT statements", "WHERE filters", "GROUP BY", "JOINS", "Subqueries", "Window functions", "PostgreSQL & MySQL"] },
  { n: 4, title: "Python", duration: "6 weeks", level: "Intermediate",
    topics: ["Variables & loops", "Functions", "File handling", "NumPy", "Pandas", "EDA", "Jupyter notebooks"] },
  { n: 5, title: "Data Collection & Prep", duration: "3 weeks", level: "Intermediate",
    topics: ["APIs", "Web scraping", "ETL", "Pipelines", "Preprocessing", "Missing values", "Feature engineering"] },
  { n: 6, title: "Data Visualization", duration: "3 weeks", level: "Intermediate",
    topics: ["Matplotlib", "Seaborn", "Plotly", "Tableau", "Power BI", "Interactive dashboards", "Storytelling"] },
  { n: 7, title: "Version Control", duration: "1 week", level: "Beginner",
    topics: ["Git basics", "GitHub workflow", "Branches & commits", "Collaboration", "Portfolio management"] },
  { n: 8, title: "Machine Learning", duration: "8 weeks", level: "Advanced",
    topics: ["Supervised learning", "Unsupervised learning", "Regression", "Classification", "Clustering", "Model evaluation", "Scikit-learn"] },
  { n: 9, title: "Big Data & Advanced", duration: "4 weeks", level: "Advanced",
    topics: ["Big data concepts", "Hadoop", "Spark", "Cloud analytics", "AI integration", "Real-world workflows"] },
];

const levelColor: Record<string, string> = {
  Beginner: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Advanced: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

function RoadmapPage() {
  return (
    <AppLayout>
      <div className="px-6 py-10 max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 glass-card px-3 py-1 rounded-full text-xs mb-4">
            <Sparkles className="h-3 w-3 text-primary" /> 9 Stages · 30+ Weeks
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            The <span className="gradient-text">Data Analyst Roadmap</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your complete step-by-step path from zero to job-ready analyst. Each stage builds on the last.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-accent to-transparent" />
          <div className="space-y-6">
            {stages.map((s, i) => (
              <div key={s.n} className="relative pl-14 md:pl-20">
                <div className="absolute left-0 md:left-2 top-2 h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-primary-foreground animate-pulse-glow">
                  {s.n}
                </div>
                <Card className="glass-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="text-xs text-muted-foreground">STAGE {s.n}</div>
                      <h2 className="text-2xl font-bold">{s.title}</h2>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={levelColor[s.level]}>{s.level}</Badge>
                      <Badge variant="outline">{s.duration}</Badge>
                    </div>
                  </div>
                  <Accordion type="single" collapsible defaultValue={i === 0 ? "topics" : undefined}>
                    <AccordionItem value="topics" className="border-0">
                      <AccordionTrigger className="text-sm py-2">View {s.topics.length} topics</AccordionTrigger>
                      <AccordionContent>
                        <ul className="grid sm:grid-cols-2 gap-2 mt-2">
                          {s.topics.map((t, idx) => (
                            <li key={t} className="flex items-center gap-2 text-sm">
                              {idx === 0 && i === 0 ? (
                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
