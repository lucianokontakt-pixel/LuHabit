import { LayoutGrid, Dumbbell, HeartPulse, BarChart3, type LucideIcon } from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Übersicht", icon: LayoutGrid },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/koerper", label: "Körper", icon: HeartPulse },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function isActiveLink(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/habit");
  return pathname === href || pathname.startsWith(`${href}/`);
}
