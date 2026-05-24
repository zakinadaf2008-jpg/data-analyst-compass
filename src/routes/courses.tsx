import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calculator, Sheet, Database, Code2, BarChart3, Brain, Server, GitBranch, Search, PlayCircle, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — Learn SQL, Python, Excel and More" },
      { name: "description", content: "Beginner to advanced data analyst courses on Excel, SQL, Python, visualization and ML with free video lessons." },
    ],
    links: [{ rel: "canonical", href: "/courses" }],
  }),
  component: CoursesPage,
});

type Lesson = { title: string; duration: string; youtubeId: string };
type Course = {
  icon: typeof Calculator;
  title: string;
  level: string;
  duration: string;
  tags: string[];
  progress: number;
  description: string;
  lessons: Lesson[];
};

const categories: Course[] = [
  {
    icon: Calculator, title: "Mathematics & Statistics", level: "Beginner", duration: "20h",
    tags: ["Probability", "Regression", "Hypothesis"], progress: 40,
    description: "Master the statistical foundations every analyst needs.",
    lessons: [
      { title: "Statistics — Full University Course", duration: "8h", youtubeId: "xxpc-HPKN28" },
      { title: "Probability Fundamentals", duration: "2h", youtubeId: "uzkc-qNVoOk" },
      { title: "Linear Regression Explained", duration: "1h", youtubeId: "nk2CQITm_eo" },
    ],
  },
  {
    icon: Sheet, title: "Excel", level: "Beginner", duration: "12h",
    tags: ["Pivots", "Power Query", "Formulas"], progress: 85,
    description: "From formulas to pivot tables and Power Query.",
    lessons: [
      { title: "Excel for Data Analysts — Full Course", duration: "3h", youtubeId: "opJgMj1IUrc" },
      { title: "Pivot Tables Mastery", duration: "1h", youtubeId: "m0wI61ahfLc" },
      { title: "Power Query Tutorial", duration: "1.5h", youtubeId: "OT5XadIMPzM" },
    ],
  },
  {
    icon: Database, title: "SQL", level: "Beginner", duration: "18h",
    tags: ["Joins", "Windows", "Subqueries"], progress: 70,
    description: "Query like a pro — joins, windows, CTEs and more.",
    lessons: [
      { title: "SQL Tutorial — Full Database Course", duration: "4h", youtubeId: "HXV3zeQKqGY" },
      { title: "Advanced SQL — Window Functions", duration: "1h", youtubeId: "Ww71knvhQ-s" },
      { title: "SQL Joins Explained", duration: "30m", youtubeId: "9yeOJ0ZMUYw" },
    ],
  },
  {
    icon: Code2, title: "Python", level: "Intermediate", duration: "30h",
    tags: ["Pandas", "NumPy", "EDA"], progress: 55,
    description: "Pandas, NumPy and exploratory data analysis.",
    lessons: [
      { title: "Python for Data Analysis — Full Course", duration: "10h", youtubeId: "wUSDVGivd-8" },
      { title: "Pandas Tutorial", duration: "1h", youtubeId: "vmEHCJofslg" },
      { title: "NumPy Crash Course", duration: "1h", youtubeId: "QUT1VHiLmmI" },
    ],
  },
  {
    icon: BarChart3, title: "Visualization", level: "Intermediate", duration: "16h",
    tags: ["Tableau", "Power BI", "Plotly"], progress: 30,
    description: "Tell stories with data using Tableau and Power BI.",
    lessons: [
      { title: "Tableau Full Course", duration: "4h", youtubeId: "aHaOIvR00So" },
      { title: "Power BI Full Course", duration: "4h", youtubeId: "AGrl-H87pRU" },
      { title: "Plotly in Python", duration: "1h", youtubeId: "GGL6U0k8WYA" },
    ],
  },
  {
    icon: Brain, title: "Machine Learning", level: "Advanced", duration: "40h",
    tags: ["Sklearn", "Models", "Tuning"], progress: 10,
    description: "Supervised and unsupervised models with scikit-learn.",
    lessons: [
      { title: "Machine Learning — Full Course", duration: "10h", youtubeId: "i_LwzRVP7bg" },
      { title: "Scikit-learn Tutorial", duration: "2h", youtubeId: "0B5eIE_1vpU" },
      { title: "ML in 100 Days", duration: "100h", youtubeId: "7eh4d6sabA0" },
    ],
  },
  {
    icon: Server, title: "Big Data", level: "Advanced", duration: "24h",
    tags: ["Spark", "Hadoop", "Cloud"], progress: 0,
    description: "Scale your analyses with Spark and cloud platforms.",
    lessons: [
      { title: "Apache Spark Full Course", duration: "3h", youtubeId: "_C8kWso4ne4" },
      { title: "Hadoop Tutorial", duration: "2h", youtubeId: "mafw2-CVYnA" },
      { title: "Data Engineering on AWS", duration: "2h", youtubeId: "qWru-b6m030" },
    ],
  },
  {
    icon: GitBranch, title: "Git & GitHub", level: "Beginner", duration: "6h",
    tags: ["Branching", "Workflow"], progress: 90,
    description: "Version control essentials for data professionals.",
    lessons: [
      { title: "Git and GitHub — Full Course", duration: "1h", youtubeId: "RGOj5yH7evk" },
      { title: "Git Branching Strategies", duration: "30m", youtubeId: "Uszj_k0DGsg" },
      { title: "GitHub Actions Tutorial", duration: "1h", youtubeId: "R8_veQiYBjI" },
    ],
  },
];

const levels = ["All", "Beginner", "Intermediate", "Advanced"];

function CoursesPage() {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const filtered = categories.filter(c =>
    (filter === "All" || c.level === filter) &&
    c.title.toLowerCase().includes(q.toLowerCase())
  );

  const openCourse = (c: Course) => {
    setActive(c);
    setCurrentLesson(c.lessons[0]);
  };

  const toggleComplete = (key: string) => {
    setCompleted(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Course catalog</h1>
          <p className="text-muted-foreground text-sm">8 categories · watch &amp; learn from curated free video lessons</p>
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
          <div className="flex gap-2 flex-wrap">
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
              <p className="text-xs text-muted-foreground mb-2">{c.duration} · {c.lessons.length} lessons</p>
              <p className="text-sm text-muted-foreground/80 mb-3 line-clamp-2">{c.description}</p>
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
                <Button
                  onClick={() => openCourse(c)}
                  className="w-full bg-gradient-to-r from-primary to-accent"
                >
                  <PlayCircle className="h-4 w-4" />
                  {c.progress > 0 ? "Continue Watching" : "Start Learning"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-5xl glass-card border-border/50 p-0 overflow-hidden">
          {active && currentLesson && (
            <div className="grid md:grid-cols-[1fr_280px] max-h-[85vh]">
              <div className="flex flex-col min-w-0">
                <div className="aspect-video bg-black w-full">
                  <iframe
                    key={currentLesson.youtubeId}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${currentLesson.youtubeId}?rel=0`}
                    title={currentLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-5 border-t border-border/50">
                  <DialogHeader>
                    <DialogTitle className="text-lg">{currentLesson.title}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground mt-2">
                    From <span className="text-foreground font-medium">{active.title}</span> · {currentLesson.duration}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 glass-card"
                    onClick={() => toggleComplete(`${active.title}-${currentLesson.youtubeId}`)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completed[`${active.title}-${currentLesson.youtubeId}`] ? "Completed" : "Mark complete"}
                  </Button>
                </div>
              </div>
              <div className="border-l border-border/50 bg-muted/20 overflow-y-auto">
                <div className="p-4 border-b border-border/50">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Lessons</p>
                  <p className="font-semibold text-sm">{active.title}</p>
                </div>
                <ul className="divide-y divide-border/40">
                  {active.lessons.map((l, i) => {
                    const key = `${active.title}-${l.youtubeId}`;
                    const isActive = l.youtubeId === currentLesson.youtubeId;
                    return (
                      <li key={l.youtubeId}>
                        <button
                          onClick={() => setCurrentLesson(l)}
                          className={`w-full text-left p-3 flex gap-3 items-start hover:bg-muted/40 transition ${isActive ? "bg-primary/10" : ""}`}
                        >
                          <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium ${isActive ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {completed[key] ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{l.title}</p>
                            <p className="text-xs text-muted-foreground">{l.duration}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
