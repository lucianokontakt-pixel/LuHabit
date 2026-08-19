"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Laptop, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ACTIVITY_LEVELS, useBodyProfile } from "@/lib/body-profile";

type Me = { email: string; name: string | null; picture: string | null };

const THEME_OPTIONS = [
  { value: "light", label: "Hell", icon: Sun },
  { value: "dark", label: "Dunkel", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export default function EinstellungenPage() {
  const [me, setMe] = useState<Me | null>(null);
  const { profile, update } = useBodyProfile();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standardmuster für next-themes Hydration-Fix
    setMounted(true);
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user: Me | null } | null) => {
        if (data?.user) setMe(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-sm text-muted-foreground">Konto &amp; Darstellung</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
          Einstellungen
        </h1>
      </div>

      <Card className="gap-4">
        <div className="px-(--card-spacing)">
          <h2 className="text-sm font-medium">Konto</h2>
        </div>
        <div className="flex items-center gap-3 px-(--card-spacing)">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-elevated text-sm font-medium">
            {me?.picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- externes Google-Bild, kein Loader nötig
              <img src={me.picture} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            {me?.name && <p className="truncate text-sm font-medium">{me.name}</p>}
            <p className="truncate text-xs text-muted-foreground">{me?.email ?? "Nicht angemeldet"}</p>
          </div>
        </div>
      </Card>

      <Card className="gap-4">
        <div className="px-(--card-spacing)">
          <h2 className="text-sm font-medium">Darstellung</h2>
        </div>
        <div className="flex gap-2 px-(--card-spacing)">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={mounted && theme === value}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-pill text-sm font-medium transition-colors",
                mounted && theme === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated text-muted-foreground ring-1 ring-foreground/8 hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="gap-4">
        <div className="px-(--card-spacing)">
          <h2 className="text-sm font-medium">Körperprofil</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Für den Kalorienrechner auf der Körper-Seite.
          </p>
        </div>

        <div className="flex flex-col gap-4 px-(--card-spacing)">
          <div className="flex gap-2">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => update({ gender: g })}
                aria-pressed={profile.gender === g}
                className={cn(
                  "h-10 flex-1 rounded-pill text-sm font-medium transition-colors",
                  profile.gender === g
                    ? "bg-primary text-primary-foreground"
                    : "bg-elevated text-muted-foreground ring-1 ring-foreground/8 hover:text-foreground"
                )}
              >
                {g === "male" ? "Männlich" : "Weiblich"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-age" className="text-xs text-muted-foreground">
                Alter
              </Label>
              <Input
                id="profile-age"
                type="number"
                min={0}
                inputMode="numeric"
                value={profile.age}
                onChange={(e) => update({ age: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-height" className="text-xs text-muted-foreground">
                Größe (cm)
              </Label>
              <Input
                id="profile-height"
                type="number"
                min={0}
                inputMode="numeric"
                value={profile.height}
                onChange={(e) => update({ height: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">Aktivitätslevel</Label>
            <div className="flex flex-col gap-1.5">
              {ACTIVITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => update({ activity: level.value })}
                  aria-pressed={profile.activity === level.value}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-field px-3.5 py-2.5 text-left text-sm transition-colors",
                    profile.activity === level.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-elevated ring-1 ring-foreground/8 hover:ring-foreground/20"
                  )}
                >
                  <span className="font-medium">{level.label}</span>
                  <span
                    className={cn(
                      "text-xs",
                      profile.activity === level.value
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {level.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
