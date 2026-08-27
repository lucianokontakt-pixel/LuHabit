"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { SyncStatus } from "@/components/sync-status";
import { NAV_LINKS, isActiveLink } from "@/lib/nav-links";
import { buttonVariants } from "@/components/ui/button";
import { useStartZiel } from "@/lib/use-start-ziel";
import { Dumbbell, Play } from "lucide-react";

export function Nav() {
  const pathname = usePathname();
  const { ziel, laeuft } = useStartZiel();

  // Auf der Login-Seite gibt es noch nichts zu navigieren.
  if (pathname === "/login") return null;

  return (
    // steep's nav is whisper-quiet: no border, no shadow, just the logo and links.
    <header
      className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="px-edge mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 sm:[--edge:1.5rem]">
        <Link href="/" className="font-display text-xl tracking-tight">
          LuHabit
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = isActiveLink(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-pill px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-card font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          {/* Auf dem Handy sitzt der Start-Knopf in der unteren Leiste. Hier
              oben hätte man ihn sonst nirgends: wer in der Statistik steht und
              trainieren will, müsste erst zurück auf die Übersicht. */}
          <Link
            href={ziel}
            /* Über cn, nicht direkt über buttonVariants: sonst stünden das
               inline-flex der Grundfassung und dieses hidden nebeneinander und
               die Reihenfolge im Stylesheet entschiede, wer gewinnt. */
            className={cn(buttonVariants({ size: "sm" }), "mr-1 hidden sm:inline-flex")}
          >
            {laeuft ? <Play /> : <Dumbbell />}
            {laeuft ? "Weiter" : "Start"}
          </Link>
          <SyncStatus />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
