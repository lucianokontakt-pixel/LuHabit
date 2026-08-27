"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/training", label: "Übersicht" },
  { href: "/training/plaene", label: "Pläne" },
  { href: "/training/uebungen", label: "Übungen" },
  { href: "/training/progression", label: "Progression" },
  { href: "/training/statistik", label: "Statistik" },
];

export function TrainingTabs() {
  const pathname = usePathname();

  return (
    // Grid statt horizontalem Scroll: fünf Tabs passen auf 375px nicht in eine
    // Zeile, sollen aber ohne Wischen erreichbar sein — also zwei Reihen à drei
    // Spalten. Ab sm ist Platz für eine Zeile.
    <div className="grid grid-cols-3 gap-1 rounded-panel bg-card p-1 sm:inline-flex sm:w-auto sm:rounded-pill">
      {TABS.map((tab) => {
        const active =
          tab.href === "/training" ? pathname === "/training" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-pill px-2 py-1.5 text-center text-xs whitespace-nowrap transition-colors sm:px-3.5 sm:text-sm",
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
