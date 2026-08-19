"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, RefreshCw, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Me = { email: string; name: string | null; picture: string | null };

export function UserMenu() {
  const [me, setMe] = useState<Me | null>(null);
  const logoutForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user: Me | null } | null) => {
        if (active && data?.user) setMe(data.user);
      })
      .catch(() => {
        // Ohne eingerichteten Login gibt es nichts anzuzeigen.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!me) return null;

  const initials = (me.name ?? me.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Konto"
        className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-card text-xs font-medium transition-colors hover:bg-elevated"
      >
        {me.picture ? (
          // eslint-disable-next-line @next/next/no-img-element -- externes Google-Bild, kein Loader nötig
          <img src={me.picture} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initials || <User className="size-4" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <div className="px-2 py-1.5">
          {me.name && <p className="truncate text-sm font-medium">{me.name}</p>}
          <p className="truncate text-xs text-muted-foreground">{me.email}</p>
        </div>
        {/* Echtes Formular statt window.location: das Abmelden setzt
            serverseitig Cookies und braucht eine vollständige Navigation. */}
        <DropdownMenuItem render={<Link href="/einstellungen" />}>
          <RefreshCw className="size-4" />
          Automatischer Sync
        </DropdownMenuItem>
        <form ref={logoutForm} action="/api/auth/logout" method="post" className="hidden" />
        <DropdownMenuItem onClick={() => logoutForm.current?.submit()}>
          <LogOut className="size-4" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
