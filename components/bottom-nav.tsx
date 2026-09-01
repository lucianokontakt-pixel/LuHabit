"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, isActiveLink } from "@/lib/nav-links";
import { useStartZiel } from "@/lib/use-start-ziel";

/**
 * Die untere Leiste: eine schwebende dunkle Pille mit vier Bereichen, und
 * daneben der Startknopf.
 *
 * Der Knopf sitzt bewusst außerhalb der Pille statt in ihrer Mitte. In der
 * Mitte zerteilte er sie — und eine zerteilte Pille ist keine mehr, sondern
 * zwei Hälften. Draußen bleibt beides ganz: die Pille eine Form, der Knopf
 * eine Handlung. Dass er die häufigste ist, sagt jetzt die Farbe: er ist das
 * einzige Violett hier unten.
 *
 * Beschriftungen fallen weg. Vier feste Ziele, jedes mit eigenem Sinnbild —
 * wer die App zweimal geöffnet hat, liest sie ohnehin nicht mehr, und ohne sie
 * bleibt die Pille schlank genug, um zu schweben statt zu lasten.
 *
 * `justify-between` statt `justify-around`, und daran hängt mehr als es
 * aussieht: die Pille ist 64 px hoch, der aktive Kreis 48 — oben und unten
 * bleiben also 8 px. Damit der Kreis in der Rundung *sitzt* statt darin zu
 * schwimmen, muss außen dasselbe stehen, und das leisten genau die 8 px aus
 * `px-2`. `justify-around` legte davor noch eine halbe Lücke (auf 390 px
 * Bildschirm rund 19 px, und mit der Breite wachsend): der Kreis stand dann
 * mittig in der Kappe statt konzentrisch zu ihr.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { ziel, laeuft } = useStartZiel();

  if (pathname === "/login") return null;

  return (
    <nav
      className="px-edge fixed inset-x-0 bottom-0 z-40 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:hidden"
      style={{ "--edge": "0.75rem" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-16 min-w-0 flex-1 items-center justify-between rounded-pill bg-nav px-2 text-nav-foreground shadow-float">
          {NAV_LINKS.map((link) => {
            const active = isActiveLink(link.activePrefix ?? link.href, pathname);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex size-12 items-center justify-center rounded-full transition-colors",
                  active
                    ? "bg-nav-foreground text-nav"
                    : "text-nav-foreground/55 hover:text-nav-foreground"
                )}
              >
                <Icon className="size-[22px]" />
              </Link>
            );
          })}
        </div>

        <Link
          href={ziel}
          aria-label={laeuft ? "Einheit fortsetzen" : "Training starten"}
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-tint-violet text-tint-violet-ink shadow-float transition-transform active:scale-95"
        >
          {laeuft ? <Play className="size-6" /> : <Dumbbell className="size-6" />}
        </Link>
      </div>
    </nav>
  );
}
