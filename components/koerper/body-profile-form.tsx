"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_LEVELS, useBodyProfile } from "@/lib/body-profile";
import { cn } from "@/lib/utils";

/**
 * Alter, Geschlecht, Größe, Aktivität.
 *
 * Steht hier und nicht in den Einstellungen, weil es genau daneben wirkt: der
 * BMI oben braucht die Größe, der Kalorienrechner darunter alle vier, und das
 * Geschlecht entscheidet, welche Figur die Körperkarte zeichnet. Ein Formular
 * gehört neben seine Wirkung.
 */
export function BodyProfileForm() {
  const { profile, update } = useBodyProfile();

  return (
    <Card className="gap-4">
      <div className="px-(--card-spacing)">
        <h2 className="text-subheading font-display">Dein Profil</h2>
        <p className="text-sm text-muted-foreground">
          Grundlage für BMI, Kalorienbedarf und die Figur auf der Körperkarte.
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
  );
}
