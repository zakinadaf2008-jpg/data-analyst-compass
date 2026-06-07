import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Map, BookOpen, Library, FolderKanban, Briefcase, Home, Sparkles, MessageSquare, LogOut, LogIn, ShieldCheck, Trophy, Rocket, CalendarCheck, Award,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Roadmap", url: "/roadmap", icon: Map },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "AI Tutor", url: "/chat", icon: MessageSquare },
  { title: "Study Plan", url: "/study-plan", icon: CalendarCheck },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Showcase", url: "/showcase", icon: Rocket },
  { title: "Achievements", url: "/achievements", icon: Award },
  { title: "Resources", url: "/resources", icon: Library },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Career", url: "/career", icon: Briefcase },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent animate-pulse-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold gradient-text">Analyst Hub</span>
            <span className="text-[10px] text-muted-foreground">Roadmap & Learning</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url || path.startsWith(item.url + "/")}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path.startsWith("/admin")}>
                    <Link to="/admin">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden">
          {user ? (
            <div className="glass-card rounded-lg p-3 text-xs space-y-2">
              <p className="font-medium truncate">{user.email}</p>
              <Button size="sm" variant="outline" className="w-full" onClick={() => signOut()}>
                <LogOut className="h-3 w-3" /> Sign out
              </Button>
            </div>
          ) : (
            <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent" onClick={() => navigate({ to: "/login" })}>
              <LogIn className="h-3 w-3" /> Sign in
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
