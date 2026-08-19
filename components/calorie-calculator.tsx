"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { ACTIVITY_LEVELS, basalMetabolicRate, useBodyProfile } from "@/lib/body-profile";

export function CalorieCalculator({ latestWeight }: { latestWeight?: number }) {
  const { profile, update, hydrated } = useBodyProfile();

  useEffect(() => {
    if (hydrated && !profile.weight && latestWeight) {
      update({ weight: String(latestWeight) });
    }
  }, [hydrated, latestWeight, profile.weight, update]);

  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  const activity = Number(profile.activity);

  const bmr = basalMetabolicRate({ gender: profile.gender, weight, height, age });
  const tdee = bmr !== null ? bmr * activity : null;

  const results =
    bmr !== null && tdee !== null
      ? [
          { label: "Grundumsatz", value: bmr, hint: "BMR" },
          { label: "Tagesbedarf", value: tdee, hint: "TDEE" },
          { label: "Abnehmen", value: tdee - 500, hint: "−500 kcal" },
          { label: "Zunehmen", value: tdee + 300, hint: "+300 kcal" },
        ]
      : [];

  return (
    <Card className="gap-5">
      <div className="px-(--card-spacing)">
        <h2 className="text-subheading font-display">Kalorienrechner</h2>
        <p className="text-sm text-muted-foreground">
          Grundumsatz und Tagesbedarf nach Mifflin-St Jeor.
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

        <div className="grid grid-cols-3 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cal-age" className="text-xs text-muted-foreground">
              Alter
            </Label>
            <Input
              id="cal-age"
              type="number"
              min={0}
              inputMode="numeric"
              value={profile.age}
              onChange={(e) => update({ age: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cal-height" className="text-xs text-muted-foreground">
              Größe (cm)
            </Label>
            <Input
              id="cal-height"
              type="number"
              min={0}
              inputMode="numeric"
              value={profile.height}
              onChange={(e) => update({ height: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cal-weight" className="text-xs text-muted-foreground">
              Gewicht (kg)
            </Label>
            <Input
              id="cal-weight"
              type="number"
              min={0}
              inputMode="decimal"
              value={profile.weight}
              onChange={(e) => update({ weight: e.target.value })}
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

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 px-(--card-spacing)">
          {results.map((r) => (
            <div key={r.label} className="rounded-panel bg-elevated p-4">
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <p className="nums mt-1 text-body-lg leading-none">
                {formatNumber(Math.round(r.value))}
                <span className="ml-1 text-xs font-normal text-muted-foreground">kcal</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{r.hint}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-(--card-spacing) text-sm text-muted-foreground">
          Alter, Größe und Gewicht eintragen, um deinen Bedarf zu berechnen.
        </p>
      )}
    </Card>
  );
}
