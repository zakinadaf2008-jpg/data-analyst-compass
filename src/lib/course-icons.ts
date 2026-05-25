import {
  Calculator, Sheet, Database, Code2, BarChart3, Brain, Server, GitBranch,
  BookOpen, type LucideIcon,
} from "lucide-react";

export const COURSE_ICONS: Record<string, LucideIcon> = {
  Calculator, Sheet, Database, Code2, BarChart3, Brain, Server, GitBranch, BookOpen,
};

export const COURSE_ICON_NAMES = Object.keys(COURSE_ICONS);

export function getCourseIcon(name: string): LucideIcon {
  return COURSE_ICONS[name] ?? BookOpen;
}
