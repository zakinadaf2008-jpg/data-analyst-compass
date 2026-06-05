import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Upload, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your profile — Data Analyst Compass" }] }),
  component: ProfilePage,
});

type Profile = { id: string; display_name: string | null; avatar_url: string | null };

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("id", user.id);
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Avatar updated");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  };

  const sendReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  };

  if (!user) return null;

  const initials = (profile?.display_name || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UserIcon className="h-7 w-7 text-primary" />
            Your profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage how you appear on the leaderboard and across the app.</p>
        </div>

        <Card className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name || "avatar"} />}
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload new avatar"}
              </Button>
              <p className="text-xs text-muted-foreground">PNG / JPG, max 5MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email || ""} disabled />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={saveName} disabled={saving} className="bg-gradient-to-r from-primary to-accent">
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="outline" onClick={sendReset}>Send password reset email</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
