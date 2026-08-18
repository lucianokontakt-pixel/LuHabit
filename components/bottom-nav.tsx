"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useHabitRegistry } from "@/lib/habit-registry";
import { LayoutGrid, Weight } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const { habits, order } = useHabitRegistry();

  const links = [
    { href: "/", label: "Übersicht", icon: LayoutGrid },
    ...order
      .map((id) => habits[id])
      .filter(Boolean)
      .map((config) => ({
        href: config.isCustom ? `/habit/${config.type}` : `/${config.type}`,
        label: config.label,
        icon: config.icon,
      })),
    { href: "/stats", label: "Stats", icon: Weight },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex overflow-x-auto">
        {links.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-w-16 flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "text-foreground")} />
              <span className="truncate max-w-16">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
