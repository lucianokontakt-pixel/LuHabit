import { House, CalendarDays, BarChart3, List, type LucideIcon } from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };
export type SubTab = { href: string; label: string };

/**
 * Die vier Bereiche der App — plus der Start-Knopf, der keiner ist.
 *
 * Pläne und Übungen waren bis hierher Unter-Tabs im Trainingsbereich. Das hieß:
 * zwei Tipps bis zur Bibliothek, und die Startseite trug drei Tabs, die auf
 * jeder ihrer Seiten mitliefen. Jetzt hat jeder Bereich seinen eigenen Platz.
 *
 * Der Start-Knopf steht bewusst nicht in dieser Liste: er führt nicht auf eine
 * Seite, die man „besuchen" kann, sondern beginnt (oder setzt fort) eine
 * Einheit. Die untere Leiste setzt ihn deshalb selbst in die Mitte.
 */
export const NAV_LINKS: NavLink[] = [
  // Nicht „Start" — den Namen trägt der Knopf in der Mitte. „Training" heißt
  // auch die Überschrift der Seite; wer den Reiter tippt, soll dort ankommen,
  // wo er hinwollte, und nicht auf etwas anders Benanntem.
  { href: "/", label: "Training", icon: House },
  { href: "/plaene", label: "Pläne", icon: CalendarDays },
  { href: "/statistik", label: "Statistik", icon: BarChart3 },
  { href: "/uebungen", label: "Übungen", icon: List },
];

/**
 * Die Seiten im Statistikbereich. „Körper" hängt hier und nicht mehr an einem
 * eigenen Hauptbereich: Körperkarte und Sätze pro Woche beantworten „wie
 * verteilt sich meine Arbeit", und das ist eine Frage der Statistik. Gewicht
 * und Körperfett sind Verläufe wie die anderen auch.
 */
export const STATISTIK_TABS: readonly SubTab[] = [
  { href: "/statistik", label: "Verlauf" },
  { href: "/statistik/progression", label: "Je Übung" },
  { href: "/statistik/koerper", label: "Körper" },
];

/** Seiten ohne eigenen Platz in der Leiste, die trotzdem irgendwo leuchten sollen. */
const HOME_PREFIXES = ["/session", "/einheit"];

export function isActiveLink(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/" || HOME_PREFIXES.some((p) => pathname.startsWith(p));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
