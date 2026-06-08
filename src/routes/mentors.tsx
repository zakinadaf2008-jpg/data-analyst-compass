import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  listMentors, getMyMentorProfile, upsertMentorProfile, createSlot, deleteSlot,
  bookSlot, listMyBookings, cancelBooking,
} from "@/lib/mentors.functions";
import { CalendarClock, Plus, Trash2, Video, X, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/mentors")({
  head: () => ({ meta: [{ title: "Mentors — 1:1 Sessions" }, { name: "description", content: "Book 1:1 mentor sessions or become a mentor." }] }),
  component: MentorsPage,
});

function MentorsPage() {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Mentors & 1:1 Sessions</h1>
          <p className="text-muted-foreground text-sm mt-1">Book time with a mentor, or share your expertise as one.</p>
        </div>
        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse"><Users className="h-4 w-4" /> Browse mentors</TabsTrigger>
            <TabsTrigger value="bookings"><CalendarClock className="h-4 w-4" /> My bookings</TabsTrigger>
            <TabsTrigger value="become"><Video className="h-4 w-4" /> Become a mentor</TabsTrigger>
          </TabsList>
          <TabsContent value="browse" className="mt-6"><BrowseTab /></TabsContent>
          <TabsContent value="bookings" className="mt-6"><BookingsTab /></TabsContent>
          <TabsContent value="become" className="mt-6"><BecomeTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function BrowseTab() {
  const fetchMentors = useServerFn(listMentors);
  const { data } = useQuery({ queryKey: ["mentors"], queryFn: () => fetchMentors() });
  const mentors = data?.mentors ?? [];
  if (!mentors.length) {
    return <p className="text-sm text-muted-foreground">No mentors available yet. Be the first — head to "Become a mentor".</p>;
  }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {mentors.map((m: any) => <MentorCard key={m.id} mentor={m} />)}
    </div>
  );
}

function MentorCard({ mentor }: { mentor: any }) {
  const qc = useQueryClient();
  const book = useServerFn(bookSlot);
  const [open, setOpen] = useState(false);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: (d: any) => book({ data: d }),
    onSuccess: () => {
      toast.success("Session booked!");
      setOpen(false); setTopic(""); setNotes(""); setSlotId(null);
      qc.invalidateQueries({ queryKey: ["mentors"] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to book"),
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            {mentor.profile?.avatar_url && <AvatarImage src={mentor.profile.avatar_url} />}
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
              {(mentor.profile?.display_name ?? "M").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{mentor.profile?.display_name ?? "Mentor"}</CardTitle>
            <CardDescription className="line-clamp-2">{mentor.headline}</CardDescription>
          </div>
          <Badge variant="secondary">
            {Number(mentor.hourly_rate_usd) > 0 ? `$${mentor.hourly_rate_usd}/hr` : "Free"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mentor.bio && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{mentor.bio}</p>}
        {mentor.expertise?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {mentor.expertise.map((e: string) => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}
          </div>
        )}
        <div>
          <p className="text-xs font-medium mb-2">Open slots ({mentor.timezone}):</p>
          {mentor.slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">No slots open right now.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mentor.slots.slice(0, 6).map((s: any) => (
                <Button key={s.id} size="sm" variant="outline" onClick={() => { setSlotId(s.id); setOpen(true); }}>
                  {format(new Date(s.starts_at), "MMM d, h:mm a")}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book a session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Topic *</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. SQL window functions" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What do you want to focus on?" />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!topic.trim() || mut.isPending}
              onClick={() => slotId && mut.mutate({ slot_id: slotId, mentor_id: mentor.id, topic, notes })}
            >Confirm booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BookingsTab() {
  const qc = useQueryClient();
  const fetchBookings = useServerFn(listMyBookings);
  const cancelFn = useServerFn(cancelBooking);
  const { data } = useQuery({ queryKey: ["my-bookings"], queryFn: () => fetchBookings() });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => { toast.success("Booking cancelled"); qc.invalidateQueries({ queryKey: ["my-bookings"] }); qc.invalidateQueries({ queryKey: ["mentors"] }); },
  });

  const items = data?.bookings ?? [];
  if (!items.length) return <p className="text-sm text-muted-foreground">No bookings yet.</p>;
  return (
    <div className="space-y-3">
      {items.map((b: any) => (
        <Card key={b.id} className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{b.topic}</p>
              <p className="text-xs text-muted-foreground">
                with {b.mentor?.headline ?? "mentor"} •{" "}
                {b.slot && format(new Date(b.slot.starts_at), "PPp")}
              </p>
              {b.meeting_link && (
                <a href={b.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                  Join meeting
                </a>
              )}
            </div>
            <Badge>{b.status}</Badge>
            <Button size="sm" variant="ghost" onClick={() => cancel.mutate(b.id)}>
              <X className="h-3 w-3" /> Cancel
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BecomeTab() {
  const qc = useQueryClient();
  const fetchMine = useServerFn(getMyMentorProfile);
  const upsertFn = useServerFn(upsertMentorProfile);
  const createSlotFn = useServerFn(createSlot);
  const deleteSlotFn = useServerFn(deleteSlot);

  const { data } = useQuery({ queryKey: ["my-mentor"], queryFn: () => fetchMine() });
  const mentor = data?.mentor;

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState("");
  const [rate, setRate] = useState("0");
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [active, setActive] = useState(true);
  const [seeded, setSeeded] = useState(false);

  if (mentor && !seeded) {
    setHeadline(mentor.headline ?? "");
    setBio(mentor.bio ?? "");
    setExpertise((mentor.expertise ?? []).join(", "));
    setRate(String(mentor.hourly_rate_usd ?? 0));
    setTz(mentor.timezone ?? "UTC");
    setActive(mentor.is_active);
    setSeeded(true);
  }

  const save = useMutation({
    mutationFn: () => upsertFn({ data: {
      headline, bio, expertise: expertise.split(",").map((s) => s.trim()).filter(Boolean),
      hourly_rate_usd: Number(rate) || 0, timezone: tz, is_active: active,
    } }),
    onSuccess: () => { toast.success("Mentor profile saved"); qc.invalidateQueries({ queryKey: ["my-mentor"] }); qc.invalidateQueries({ queryKey: ["mentors"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const addSlot = useMutation({
    mutationFn: () => createSlotFn({ data: { starts_at: new Date(slotStart).toISOString(), ends_at: new Date(slotEnd).toISOString() } }),
    onSuccess: () => { toast.success("Slot added"); setSlotStart(""); setSlotEnd(""); qc.invalidateQueries({ queryKey: ["my-mentor"] }); qc.invalidateQueries({ queryKey: ["mentors"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const removeSlot = useMutation({
    mutationFn: (id: string) => deleteSlotFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-mentor"] }),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Your mentor profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Headline *</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Senior Data Analyst @ Acme" /></div>
          <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} /></div>
          <div><Label>Expertise (comma-separated)</Label><Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="SQL, Python, dbt" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rate (USD/hr, 0 = free)</Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
            <div><Label>Timezone</Label><Input value={tz} onChange={(e) => setTz(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Active & discoverable</Label></div>
          <Button onClick={() => save.mutate()} disabled={!headline.trim() || save.isPending} className="bg-gradient-to-r from-primary to-accent">
            {mentor ? "Update profile" : "Create profile"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Your availability</CardTitle><CardDescription>Add bookable time slots.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {!mentor ? (
            <p className="text-xs text-muted-foreground">Save your mentor profile first.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Start</Label><Input type="datetime-local" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} /></div>
                <div><Label className="text-xs">End</Label><Input type="datetime-local" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} /></div>
              </div>
              <Button size="sm" onClick={() => addSlot.mutate()} disabled={!slotStart || !slotEnd || addSlot.isPending}>
                <Plus className="h-3 w-3" /> Add slot
              </Button>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {(data?.slots ?? []).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
                    <span>{format(new Date(s.starts_at), "PPp")} → {format(new Date(s.ends_at), "p")}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.status === "open" ? "secondary" : "default"} className="text-[10px]">{s.status}</Badge>
                      {s.status === "open" && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeSlot.mutate(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
