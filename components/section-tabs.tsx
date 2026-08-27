"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SubTab } from "@/lib/nav-links";

/**
 * Die zweite Ebene der Navigation: die Seiten innerhalb eines Tabs.
 *
 * Der erste Eintrag ist die Wurzel des Bereichs und gilt nur bei genauer
 * Übereinstimmung — sonst wäre er auf jeder Unterseite mit aktiv. Alle anderen
 * nehmen auch ihre Unterseiten für sich (ein Plan-Detail gehört zu „Pläne").
 */
export function SectionTabs({ tabs }: { tabs: readonly SubTab[] }) {
  const pathname = usePathname();
  const root = tabs[0]?.href;

  return (
    <div className="flex gap-1 rounded-pill bg-card p-1">
      {tabs.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== root && pathname.startsWith(`${tab.href}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-pill px-2 py-1.5 text-center text-xs whitespace-nowrap transition-colors sm:flex-none sm:px-3.5 sm:text-sm",
              active
                ? "bg-elevated font-medium text-foreground shadow-popover"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
