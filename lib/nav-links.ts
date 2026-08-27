import { Dumbbell, HeartPulse, BarChart3, type LucideIcon } from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

export const NAV_LINKS: NavLink[] = [
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/training/statistik", label: "Statistik", icon: BarChart3 },
  { href: "/koerper", label: "Körper", icon: HeartPulse },
];

export function isActiveLink(href: string, pathname: string): boolean {
  // Statistik ist ein eigener Tab und liegt (noch) unter /training — sie darf
  // deshalb nicht auch den Trainings-Tab aktiv setzen.
  if (href === "/training") {
    return pathname.startsWith("/training") && !pathname.startsWith("/training/statistik");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
