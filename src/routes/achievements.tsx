import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import * as Icons from "lucide-react";
import { Award, Download, Lock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getMyAchievements, getMyCertificates } from "@/lib/achievements.functions";

export const Route = createFileRoute("/achievements")({
  component: AchievementsPage,
  head: () => ({ meta: [{ title: "Achievements & Certificates · Analyst Hub" }] }),
});

function AchievementsPage() {
  const { user } = useAuth();
  const fetchAch = useServerFn(getMyAchievements);
  const fetchCerts = useServerFn(getMyCertificates);
  const achQ = useQuery({ queryKey: ["achievements"], queryFn: () => fetchAch(), enabled: !!user });
  const certQ = useQuery({ queryKey: ["certificates"], queryFn: () => fetchCerts(), enabled: !!user });

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <h1 className="text-3xl font-bold">Sign in to view your achievements</h1>
          <Link to="/login"><Button>Sign in</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const achievements = achQ.data?.achievements ?? [];
  const earned = achievements.filter((a) => a.earned_at);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-8 space-y-10">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Achievements</h1>
          <p className="text-muted-foreground mt-1">{earned.length} of {achievements.length} unlocked</p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Award className="h-5 w-5" /> Certificates</h2>
          {certQ.data?.certificates.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {certQ.data.certificates.map((c) => (
                <CertificateCard key={c.id} cert={c} learnerName={certQ.data!.learnerName} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              Complete all lessons in a course to earn a certificate.
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Badges</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {achievements.map((a) => {
              const Icon = (Icons[a.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ?? Award;
              const unlocked = !!a.earned_at;
              return (
                <Card key={a.id} className={`p-5 space-y-3 transition ${unlocked ? "border-primary/40 bg-primary/5" : "opacity-70"}`}>
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${unlocked ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {unlocked ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                    </div>
                    {unlocked && <Badge variant="secondary">Earned</Badge>}
                  </div>
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                  </div>
                  {!unlocked && <Progress value={a.progress * 100} className="h-1.5" />}
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function CertificateCard({ cert, learnerName }: { cert: { id: string; issued_at: string; course: { title: string; slug: string } | null }; learnerName: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const downloadPng = async () => {
    if (!ref.current) return;
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: null });
    const link = document.createElement("a");
    link.download = `certificate-${cert.course?.slug ?? cert.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const issued = new Date(cert.issued_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <Card className="overflow-hidden">
      <div ref={ref} className="relative aspect-[1.414/1] bg-gradient-to-br from-background via-primary/5 to-accent/10 p-8 flex flex-col items-center justify-center text-center border-b">
        <div className="absolute inset-3 border-2 border-primary/30 rounded-lg pointer-events-none" />
        <Award className="h-10 w-10 text-primary mb-2" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Certificate of Completion</p>
        <p className="text-xs mt-4 text-muted-foreground">This certifies that</p>
        <p className="text-2xl font-bold mt-1 gradient-text">{learnerName}</p>
        <p className="text-xs mt-3 text-muted-foreground">has successfully completed</p>
        <p className="text-lg font-semibold mt-1">{cert.course?.title ?? "Course"}</p>
        <p className="text-[10px] text-muted-foreground mt-4">Analyst Hub · Issued {issued}</p>
      </div>
      <div className="p-3 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{cert.course?.title}</span>
        <Button size="sm" variant="outline" onClick={downloadPng}><Download className="h-3 w-3" /> PNG</Button>
      </div>
    </Card>
  );
}
