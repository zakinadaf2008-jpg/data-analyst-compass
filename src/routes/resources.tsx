import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Youtube, FileText, Globe, Trophy, Github, Database, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Free Learning Resources — Data Analyst Hub" },
      { name: "description", content: "Curated free resources: YouTube channels, docs, Kaggle, GitHub repos, and datasets." },
    ],
    links: [{ rel: "canonical", href: "/resources" }],
  }),
  component: ResourcesPage,
});

const groups = [
  { icon: Youtube, title: "YouTube Channels", items: [
    { name: "StatQuest with Josh Starmer", url: "https://www.youtube.com/@statquest" },
    { name: "Alex The Analyst", url: "https://www.youtube.com/@AlexTheAnalyst" },
    { name: "Ken Jee", url: "https://www.youtube.com/@KenJee_ds" },
  ]},
  { icon: FileText, title: "Documentation", items: [
    { name: "Pandas Docs", url: "https://pandas.pydata.org/docs/" },
    { name: "PostgreSQL Tutorial", url: "https://www.postgresqltutorial.com/" },
    { name: "Scikit-learn", url: "https://scikit-learn.org/stable/" },
  ]},
  { icon: Globe, title: "Practice Sites", items: [
    { name: "LeetCode SQL", url: "https://leetcode.com/problemset/database/" },
    { name: "HackerRank", url: "https://www.hackerrank.com/domains/sql" },
    { name: "DataLemur", url: "https://datalemur.com/" },
  ]},
  { icon: Trophy, title: "Kaggle Projects", items: [
    { name: "Titanic Survival", url: "https://www.kaggle.com/competitions/titanic" },
    { name: "House Prices", url: "https://www.kaggle.com/competitions/house-prices-advanced-regression-techniques" },
    { name: "Kaggle Learn", url: "https://www.kaggle.com/learn" },
  ]},
  { icon: Github, title: "GitHub Repos", items: [
    { name: "Awesome Data Science", url: "https://github.com/academic/awesome-datascience" },
    { name: "Data Science Cheatsheets", url: "https://github.com/FavioVazquez/ds-cheatsheets" },
    { name: "Public APIs", url: "https://github.com/public-apis/public-apis" },
  ]},
  { icon: Database, title: "Free Datasets", items: [
    { name: "Kaggle Datasets", url: "https://www.kaggle.com/datasets" },
    { name: "Google Dataset Search", url: "https://datasetsearch.research.google.com/" },
    { name: "data.gov", url: "https://data.gov/" },
  ]},
];

function ResourcesPage() {
  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Free learning resources</h1>
          <p className="text-muted-foreground text-sm">Hand-picked links to accelerate your journey.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Card key={g.title} className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <g.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h2 className="font-semibold">{g.title}</h2>
              </div>
              <ul className="space-y-2">
                {g.items.map((it) => (
                  <li key={it.url}>
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/40 transition group"
                    >
                      <span>{it.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
