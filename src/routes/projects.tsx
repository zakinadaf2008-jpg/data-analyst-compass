import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Film, Wallet, Users, Store, MessageSquare, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Hands-on Data Analyst Projects" },
      { name: "description", content: "Build a portfolio with real-world projects: sales dashboards, customer segmentation, finance trackers and more." },
    ],
    links: [{ rel: "canonical", href: "/projects" }],
  }),
  component: ProjectsPage,
});

const projects = [
  { icon: ShoppingCart, title: "Sales Dashboard", level: "Beginner", stack: ["Excel", "Power BI"], desc: "Build a regional sales overview with KPIs, filters and drill-downs." },
  { icon: Film, title: "Netflix Data Analysis", level: "Beginner", stack: ["Python", "Pandas"], desc: "Explore Netflix's catalog with EDA and visualize content trends over time." },
  { icon: Wallet, title: "Personal Finance Tracker", level: "Intermediate", stack: ["SQL", "Tableau"], desc: "Track spending, categorize transactions, forecast budgets with visuals." },
  { icon: Users, title: "Customer Segmentation", level: "Advanced", stack: ["Python", "Sklearn"], desc: "Use K-Means clustering to group customers and inform marketing strategy." },
  { icon: Store, title: "E-commerce Analytics", level: "Intermediate", stack: ["SQL", "Python"], desc: "Analyze cohort retention, AOV, conversion funnels for an online store." },
  { icon: MessageSquare, title: "Social Media Analytics", level: "Intermediate", stack: ["APIs", "Pandas"], desc: "Pull engagement metrics via API and surface trends in a dashboard." },
];

const levelColor: Record<string, string> = {
  Beginner: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Intermediate: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Advanced: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

function ProjectsPage() {
  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Real-world projects</h1>
          <p className="text-muted-foreground text-sm">Build, ship and showcase. Each project is a portfolio piece.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card key={p.title} className="glass-card p-5 flex flex-col group hover:scale-[1.02] transition-transform">
              <div className="flex items-start justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <p.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <Badge variant="outline" className={levelColor[p.level]}>{p.level}</Badge>
              </div>
              <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{p.desc}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {p.stack.map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50">{s}</span>
                ))}
              </div>
              <Button variant="outline" className="glass-card group-hover:bg-primary/10">
                Open project <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
