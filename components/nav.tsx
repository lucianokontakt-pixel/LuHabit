"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { SyncStatus } from "@/components/sync-status";
import { NAV_LINKS, isActiveLink } from "@/lib/nav-links";

export function Nav() {
  const pathname = usePathname();

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
          <SyncStatus />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
