"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { HABITS, HABIT_ORDER } from "@/lib/habits";
import { LayoutGrid, Weight } from "lucide-react";

const links = [
  { href: "/", label: "Übersicht", icon: LayoutGrid },
  ...HABIT_ORDER.map((type) => ({
    href: `/${type}`,
    label: HABITS[type].label,
    icon: HABITS[type].icon,
  })),
  { href: "/stats", label: "Personal Stats", icon: Weight },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            LuHabit
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
