import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, Briefcase, MessageCircle, TrendingUp, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/career")({
  head: () => ({
    meta: [
      { title: "Data Analyst Career Guide — Salary, Skills, Interviews" },
      { name: "description", content: "Career roadmap for data analysts: salaries, required skills, resume tips, interview prep and progression." },
    ],
    links: [{ rel: "canonical", href: "/career" }],
  }),
  component: CareerPage,
});

const salaries = [
  { role: "Junior Analyst", range: "$55K – $75K", years: "0–2 yrs" },
  { role: "Data Analyst", range: "$75K – $105K", years: "2–4 yrs" },
  { role: "Senior Analyst", range: "$105K – $140K", years: "4–7 yrs" },
  { role: "Analytics Manager", range: "$140K – $180K", years: "7+ yrs" },
  { role: "Data Scientist / Lead", range: "$160K – $220K+", years: "5+ yrs" },
];

const skills = [
  "SQL (advanced joins, window functions)",
  "Python (Pandas, NumPy, EDA)",
  "Excel & Spreadsheets",
  "Statistics & Hypothesis testing",
  "Visualization (Tableau / Power BI)",
  "Business acumen & communication",
  "Git & version control",
  "Basic Machine Learning",
];

const resumeTips = [
  "Quantify every bullet — '+18% conversion', 'reduced reporting time by 40%'.",
  "Lead with impact, not tasks. Tools come last.",
  "Tailor keywords to the job description (ATS friendly).",
  "Include 2–3 portfolio links above the fold.",
];

const interviewTopics = [
  "SQL coding challenges (joins, aggregations, windows)",
  "Case studies and product sense",
  "Statistics (A/B testing, p-values, confidence intervals)",
  "Python pandas manipulation",
  "Behavioral STAR stories",
];

const progression = [
  { stage: "Year 0–1", what: "Master SQL & Excel. Build 2 portfolio projects. Apply to junior roles." },
  { stage: "Year 1–3", what: "Own dashboards, learn Python deeply, drive measurable business outcomes." },
  { stage: "Year 3–5", what: "Lead analyses, mentor juniors, specialize (product / marketing / finance)." },
  { stage: "Year 5+", what: "Move into analytics leadership or transition to data science / engineering." },
];

function CareerPage() {
  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Career guide</h1>
          <p className="text-muted-foreground text-sm">Everything you need to land and grow in a data analyst role.</p>
        </div>

        {/* Salary */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Salary roadmap (US, USD)</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {salaries.map((s) => (
              <div key={s.role} className="p-4 rounded-lg bg-muted/30 border border-border/40">
                <div className="text-xs text-muted-foreground">{s.years}</div>
                <div className="font-semibold text-sm mb-1">{s.role}</div>
                <div className="gradient-text font-bold">{s.range}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Skills */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Skills employers want</h2>
            </div>
            <ul className="space-y-2">
              {skills.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Resume */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Resume tips</h2>
            </div>
            <ul className="space-y-3">
              {resumeTips.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="shrink-0">tip</Badge>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Interview */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Interview preparation</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {interviewTopics.map((t) => (
              <div key={t} className="p-3 rounded-lg bg-muted/30 text-sm">{t}</div>
            ))}
          </div>
        </Card>

        {/* Progression */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Career progression timeline</h2>
          </div>
          <div className="space-y-4">
            {progression.map((p, i) => (
              <div key={p.stage} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-sm text-primary-foreground">{i + 1}</div>
                  {i !== progression.length - 1 && <div className="flex-1 w-px bg-gradient-to-b from-primary to-transparent my-2" />}
                </div>
                <div className="pb-6">
                  <div className="font-semibold">{p.stage}</div>
                  <div className="text-sm text-muted-foreground">{p.what}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
