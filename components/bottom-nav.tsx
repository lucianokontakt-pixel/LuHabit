"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, isActiveLink } from "@/lib/nav-links";
import { useStartZiel } from "@/lib/use-start-ziel";

/**
 * Die untere Leiste: vier Bereiche und dazwischen der Start-Knopf.
 *
 * Der Knopf ist kein fünfter Bereich, sondern die häufigste Handlung der ganzen
 * App — deshalb sitzt er in der Mitte, wo der Daumen von selbst hinfällt, und
 * ist der einzige gefüllte Kreis. Farbe nimmt er keine eigene: die App ist
 * achromatisch, das Peach ist für je eine Karte pro Seite reserviert.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { ziel, laeuft } = useStartZiel();

  if (pathname === "/login") return null;

  const links = [...NAV_LINKS];
  const mitte = Math.ceil(links.length / 2);

  const tab = (link: (typeof NAV_LINKS)[number]) => {
    const active = isActiveLink(link.href, pathname);
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]"
      >
        <span
          className={cn(
            "flex h-7 w-12 items-center justify-center rounded-pill transition-colors",
            active ? "bg-card text-foreground" : "text-muted-foreground"
          )}
        >
          <Icon className="size-[18px]" />
        </span>
        <span
          className={cn(
            "transition-colors",
            active ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {link.label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-start">
        {links.slice(0, mitte).map(tab)}

        <Link
          href={ziel}
          aria-label={laeuft ? "Einheit fortsetzen" : "Training starten"}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]"
        >
          {/* Hochgezogen über die Kante, wie es der Knopf verdient, der am
              häufigsten getroffen werden muss. */}
          <span className="-mt-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float">
            {laeuft ? <Play className="size-5" /> : <Dumbbell className="size-5" />}
          </span>
          <span className="font-medium text-foreground">{laeuft ? "Weiter" : "Start"}</span>
        </Link>

        {links.slice(mitte).map(tab)}
      </div>
    </nav>
  );
}
