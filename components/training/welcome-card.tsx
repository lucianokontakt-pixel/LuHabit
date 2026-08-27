import Link from "next/link";
import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlanDay, WorkoutPlan } from "@/lib/training";

/**
 * Die erste Karte, die ein frisches Konto auf der Startseite sieht.
 *
 * Ein neuer Nutzer hat bereits einen Plan — seedStarterPlan legt ihn beim
 * ersten Login an (lib/server-user.ts). Nur sagte das bisher niemand: die
 * normale Karte behauptet "Als Nächstes dran", als hätte man den Plan selbst
 * ausgesucht. Diese hier nennt ihn beim Namen und bietet den Wechsel gleich mit
 * an, statt ihn in der Pläne-Ansicht zu verstecken.
 *
 * Sie ersetzt die normale Karte, statt über ihr zu stehen: zwei Karten mit
 * demselben Startknopf direkt untereinander wären eine Dopplung, und der
 * Bildschirm hat nur einen Blickfang zu vergeben — deshalb auch hier das
 * einzige Peach der Seite.
 *
 * Bewusst ohne die Übungs-Pillen der normalen Karte: mit dem Erklärtext und dem
 * zweiten Knopf füllte die Karte sonst ein ganzes Handy-Display, und die
 * Wochenübersicht darunter fiele unter den Rand. Was drin ist, sagt eine Zeile.
 *
 * Ein "erledigt"-Merker wird bewusst nicht gespeichert: sobald eine Einheit
 * protokolliert ist, verschwindet die Karte von selbst. Nichts, was
 * hängenbleiben oder auf einem zweiten Gerät falsch stehen könnte.
 */
export function WelcomeCard({ plan, day }: { plan: WorkoutPlan; day: PlanDay }) {
  const dayCount = plan.days.length;
  const exerciseCount = day.exercises.length;
  const details = [
    `${dayCount} ${dayCount === 1 ? "Tag" : "Tage"}`,
    plan.weeklyTarget ? `${plan.weeklyTarget}× pro Woche` : null,
  ].filter(Boolean);

  return (
    <Card variant="blush" className="gap-5">
      <div className="flex flex-col gap-1 px-(--card-spacing)">
        <p className="text-sm opacity-75">Willkommen</p>
        <p className="font-display text-4xl leading-none tracking-tight sm:text-heading">
          {plan.name}
        </p>
        <p className="mt-1 text-sm opacity-75">{details.join(" · ")}</p>
      </div>

      <p className="px-(--card-spacing) text-sm opacity-75">
        Dieser Plan ist voreingestellt — als Erstes steht {day.name} mit{" "}
        {exerciseCount} {exerciseCount === 1 ? "Übung" : "Übungen"} an. Du kannst
        sofort loslegen oder einen anderen Plan wählen.
      </p>

      <div className="flex flex-col gap-2 px-(--card-spacing) sm:flex-row">
        <Link
          href={`/session?day=${encodeURIComponent(day.id)}`}
          className={cn(buttonVariants({ size: "lg" }), "sm:flex-1")}
        >
          <Play className="size-4" />
          {day.name} starten
        </Link>
        {/* Der Zweitknopf bleibt in der Blush-Farbe, statt eine eigene Fläche
            aufzumachen. Über cn statt direkt über buttonVariants: nur so räumt
            tailwind-merge das bg-primary der Grundfassung weg — sonst stünden
            beide Klassen da und die Reihenfolge im Stylesheet entschiede. */}
        <Link
          href="/plaene"
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-current/10 text-current hover:bg-current/20"
          )}
        >
          Anderen Plan wählen
        </Link>
      </div>
    </Card>
  );
}
