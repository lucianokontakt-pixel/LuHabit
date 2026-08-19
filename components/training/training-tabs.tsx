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
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex w-max items-center gap-1 rounded-pill bg-card p-1">
        {TABS.map((tab) => {
          const active =
            tab.href === "/training" ? pathname === "/training" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-pill px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors",
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
    </div>
  );
}
