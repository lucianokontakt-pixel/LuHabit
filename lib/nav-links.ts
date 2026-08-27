import { Dumbbell, HeartPulse, BarChart3, type LucideIcon } from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };
export type SubTab = { href: string; label: string };

/**
 * Die drei Bereiche der App. Jeder beantwortet eine Frage: Training „was mache
 * ich", Statistik „wie läuft es", Körper „wo stehe ich".
 */
export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Training", icon: Dumbbell },
  { href: "/statistik", label: "Statistik", icon: BarChart3 },
  { href: "/koerper", label: "Körper", icon: HeartPulse },
];

/** Die Seiten im Trainingsbereich. Die laufende Einheit ist keine davon — sie
 *  kommt vom Start-Knopf und hat keinen Tab. */
export const TRAINING_TABS: readonly SubTab[] = [
  { href: "/", label: "Übersicht" },
  { href: "/plaene", label: "Pläne" },
  { href: "/uebungen", label: "Übungen" },
];

export const STATISTIK_TABS: readonly SubTab[] = [
  { href: "/statistik", label: "Verlauf" },
  { href: "/statistik/progression", label: "Je Übung" },
];

/** Welche Seiten unter welchem Bereich hängen. */
const TRAINING_PREFIXES = ["/plaene", "/uebungen", "/session", "/einheit"];

export function isActiveLink(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/" || TRAINING_PREFIXES.some((p) => pathname.startsWith(p));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
