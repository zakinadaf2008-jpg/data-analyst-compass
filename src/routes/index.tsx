import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles, TrendingUp, Users, Trophy, BookOpen, BarChart3,
  Database, Code, Brain, GitBranch, ArrowRight, Star, Quote,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Data Analyst Roadmap Hub — Learn Data Analysis Beginner to Advanced" },
      { name: "description", content: "Complete learning platform to become a data analyst. Roadmap, courses, projects, and resources for SQL, Python, Excel, ML and more." },
      { property: "og:title", content: "Data Analyst Roadmap Hub" },
      { property: "og:description", content: "Learn data analysis from beginner to advanced with a structured roadmap." },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

const stats = [
  { label: "Learners", value: "120K+", icon: Users },
  { label: "Lessons", value: "450+", icon: BookOpen },
  { label: "Projects", value: "60+", icon: Trophy },
  { label: "Job Outcomes", value: "92%", icon: TrendingUp },
];

const features = [
  { icon: Brain, title: "AI-Powered Guidance", desc: "Personalized learning paths adapted to your pace and goals." },
  { icon: BarChart3, title: "Interactive Roadmap", desc: "Step-by-step visual journey from foundations to advanced ML." },
  { icon: Code, title: "Real Projects", desc: "Build sales dashboards, customer segmentation and finance trackers." },
  { icon: Trophy, title: "Gamified Learning", desc: "Earn badges, climb streaks, and track progress with analytics." },
  { icon: Database, title: "Full Stack Skills", desc: "Excel, SQL, Python, Visualization, ML, Big Data — all in one." },
  { icon: GitBranch, title: "Career Ready", desc: "Resume tips, interview prep and portfolio guidance included." },
];

const pathPreview = [
  { stage: "1", title: "Foundations", topics: "Math, Stats, Probability" },
  { stage: "2", title: "Excel", topics: "Formulas, Pivots, Power Query" },
  { stage: "3", title: "SQL", topics: "Joins, Window Functions" },
  { stage: "4", title: "Python", topics: "Pandas, NumPy, EDA" },
  { stage: "5", title: "Visualization", topics: "Tableau, Power BI, Plotly" },
  { stage: "6", title: "Machine Learning", topics: "Regression, Clustering" },
];

const testimonials = [
  { name: "Aisha K.", role: "Junior Analyst @ Fintech", text: "The roadmap turned my chaotic learning into a clear path. Got hired in 5 months." },
  { name: "Marco R.", role: "Career Switcher", text: "From marketing to data analytics. The projects section is gold for portfolio building." },
  { name: "Priya S.", role: "BI Developer", text: "Best structured curriculum I've found. SQL and Python modules are exceptional." },
];

const faqs = [
  { q: "Do I need a math background?", a: "No. The Foundations stage covers everything you need from the ground up." },
  { q: "How long to become job-ready?", a: "Most learners complete the core roadmap in 4–8 months with consistent practice." },
  { q: "Is it really free?", a: "Yes — all roadmap content, resources and projects are free to explore." },
  { q: "Do you offer certificates?", a: "Achievement badges are awarded for completed stages and projects." },
];

function LandingPage() {
  return (
    <AppLayout>
      <div className="relative">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-20 md:py-32">
          <div
            className="absolute inset-0 -z-10"
            style={{ background: "var(--gradient-glow)" }}
          />
          <div className="max-w-5xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 glass-card px-4 py-1.5 rounded-full text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>AI-powered learning platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Learn Data Analysis<br />
              <span className="gradient-text">From Beginner to Advanced</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              A complete, structured roadmap with interactive lessons, real projects,
              and a smart dashboard to track your journey into data and AI.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent glow">
                <Link to="/dashboard">Start Learning <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="glass-card">
                <Link to="/roadmap">View Roadmap</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 pb-16">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Card key={s.label} className="glass-card p-6 text-center">
                <s.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl md:text-3xl font-bold gradient-text">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything you need to succeed</h2>
              <p className="text-muted-foreground">Built for beginners, intermediates and career switchers.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => (
                <Card key={f.title} className="glass-card p-6 hover:scale-[1.02] transition-transform">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Learning Path Preview */}
        <section className="px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Your learning path</h2>
              <p className="text-muted-foreground">A clear 9-stage journey from zero to advanced analyst.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pathPreview.map((p) => (
                <Card key={p.stage} className="glass-card p-6 relative overflow-hidden group">
                  <div className="absolute -top-6 -right-6 text-7xl font-bold text-primary/10 group-hover:text-primary/20 transition">
                    {p.stage}
                  </div>
                  <div className="text-xs text-primary font-medium mb-1">STAGE {p.stage}</div>
                  <div className="text-lg font-bold mb-1">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.topics}</div>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild variant="outline" className="glass-card">
                <Link to="/roadmap">Explore full roadmap <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Loved by learners worldwide</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {testimonials.map((t) => (
                <Card key={t.name} className="glass-card p-6">
                  <Quote className="h-6 w-6 text-primary mb-3" />
                  <p className="text-sm mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}
                  </div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Frequently asked</h2>
            </div>
            <Accordion type="single" collapsible className="glass-card rounded-xl px-6">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 px-6 py-10">
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-bold gradient-text">Analyst Hub</span>
              </div>
              <p className="text-muted-foreground text-xs">Your AI-powered companion to mastering data analytics.</p>
            </div>
            <div>
              <div className="font-semibold mb-3">Learn</div>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/roadmap">Roadmap</Link></li>
                <li><Link to="/courses">Courses</Link></li>
                <li><Link to="/projects">Projects</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-3">Resources</div>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/resources">Free Resources</Link></li>
                <li><Link to="/career">Career</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-3">Account</div>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/dashboard">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-6xl mx-auto text-xs text-muted-foreground text-center mt-8 pt-6 border-t border-border/30">
            © 2026 Data Analyst Roadmap Hub. All rights reserved.
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
