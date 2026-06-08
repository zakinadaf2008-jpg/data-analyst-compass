import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Bell, User, LogIn, LogOut, ShieldCheck, MessageSquare, LayoutDashboard, UserCog, CheckCheck } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listNotifications, markAllRead, markRead } from "@/lib/notifications.functions";
import { formatDistanceToNow } from "date-fns";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchNotifs = useServerFn(listNotifications);
  const markAllFn = useServerFn(markAllRead);
  const markOneFn = useServerFn(markRead);

  const { data: notifs } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: () => fetchNotifs(),
    refetchInterval: 60_000,
  });
  const unread = notifs?.unread ?? 0;
  const items = notifs?.items ?? [];

  const markAll = useMutation({
    mutationFn: () => markAllFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => markOneFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });


  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-14 flex items-center gap-3 border-b border-border/50 px-4 backdrop-blur-xl bg-background/60">
            <SidebarTrigger />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement)?.value.trim();
                if (q) navigate({ to: "/search", search: { q } });
              }}
              className="relative flex-1 max-w-md"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Search lessons, topics, courses…"
                className="pl-9 bg-muted/40 border-border/50"
              />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                    <Bell className="h-4 w-4" />
                    {unread > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-96 p-0">
                  <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Notifications</p>
                      <Badge variant="secondary" className="text-[10px]">{unread} new</Badge>
                    </div>
                    {unread > 0 && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => markAll.mutate()}>
                        <CheckCheck className="h-3 w-3" /> Mark all read
                      </Button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {!user ? (
                      <p className="p-6 text-xs text-muted-foreground text-center">
                        Sign in to see your notifications.
                      </p>
                    ) : items.length === 0 ? (
                      <p className="p-6 text-xs text-muted-foreground text-center">
                        You're all caught up. New activity will appear here.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border/50">
                        {items.map((n: any) => (
                          <li key={n.id}>
                            <button
                              onClick={() => {
                                if (!n.read_at) markOne.mutate(n.id);
                                if (n.link) navigate({ to: n.link });
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${!n.read_at ? "bg-muted/20" : ""}`}
                            >
                              <div className="flex items-start gap-2">
                                {!n.read_at && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{n.title}</p>
                                  {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account" className="rounded-full">
                    {user ? (
                      <Avatar className="h-7 w-7">
                        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="avatar" />}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-[10px]">
                          {(profile?.display_name || user.email || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user ? (
                    <>
                      <DropdownMenuLabel className="truncate">
                        {profile?.display_name || user.email}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                        <UserCog className="h-4 w-4" /> Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: "/chat" })}>
                        <MessageSquare className="h-4 w-4" /> AI Tutor
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                          <ShieldCheck className="h-4 w-4" /> Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => signOut()}>
                        <LogOut className="h-4 w-4" /> Sign out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel>Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate({ to: "/login" })}>
                        <LogIn className="h-4 w-4" /> Sign in
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
