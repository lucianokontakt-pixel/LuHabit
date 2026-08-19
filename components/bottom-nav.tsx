"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_LINKS, isActiveLink } from "@/lib/nav-links";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {NAV_LINKS.map((link) => {
          const active = isActiveLink(link.href, pathname);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]"
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
        })}
      </div>
    </nav>
  );
}
