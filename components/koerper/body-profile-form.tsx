"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBodyProfile } from "@/lib/body-profile";
import { cn } from "@/lib/utils";

/**
 * Geschlecht und Größe — mehr braucht es nicht mehr.
 *
 * Vorher standen hier auch Alter und Aktivitätslevel. Beide speisten
 * ausschließlich den Kalorienrechner; ohne ihn wären es zwei Eingabefelder
 * ohne Wirkung gewesen. Was bleibt, wirkt sichtbar auf derselben Seite: die
 * Größe im BMI oben, das Geschlecht in der Figur der Körperkarte.
 *
 * Die Felder selbst bleiben in body_profile stehen. Wer sie je gefüllt hat,
 * verliert nichts — sie werden nur nicht mehr angezeigt.
 */
export function BodyProfileForm() {
  const { profile, update } = useBodyProfile();

  return (
    <Card className="gap-4">
      <div className="px-(--card-spacing)">
        <h2 className="text-subheading font-display">Dein Profil</h2>
        <p className="text-sm text-muted-foreground">
          Grundlage für den BMI und die Figur auf der Körperkarte.
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
    </Card>
  );
}
