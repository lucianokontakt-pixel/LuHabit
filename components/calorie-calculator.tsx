"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ACTIVITY_LEVELS = [
  { value: "1.2", label: "Sitzend", hint: "wenig bis keine Bewegung" },
  { value: "1.375", label: "Leicht aktiv", hint: "Sport 1–3x / Woche" },
  { value: "1.55", label: "Moderat aktiv", hint: "Sport 3–5x / Woche" },
  { value: "1.725", label: "Sehr aktiv", hint: "Sport 6–7x / Woche" },
  { value: "1.9", label: "Extrem aktiv", hint: "körperliche Arbeit + Sport" },
];

const STORAGE_KEY = "luhabit-calorie-inputs";

type Inputs = {
  age: string;
  gender: "male" | "female";
  height: string;
  weight: string;
  activity: string;
};

const defaultInputs: Inputs = {
  age: "",
  gender: "male",
  height: "",
  weight: "",
  activity: "1.375",
};

export function CalorieCalculator({ latestWeight }: { latestWeight?: number }) {
  const [inputs, setInputs] = useState<Inputs>(defaultInputs);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lädt gespeicherte Werte einmalig beim Mount
      if (raw) setInputs((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      // ignorieren
    }
  }, []);

  useEffect(() => {
    if (!inputs.weight && latestWeight) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- übernimmt einmalig das zuletzt getrackte Gewicht als Vorschlag
      setInputs((prev) => ({ ...prev, weight: String(latestWeight) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestWeight]);

  function update(patch: Partial<Inputs>) {
    const next = { ...inputs, ...patch };
    setInputs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignorieren
    }
  }

  const age = Number(inputs.age);
  const height = Number(inputs.height);
  const weight = Number(inputs.weight);
  const activity = Number(inputs.activity);
  const valid = age > 0 && height > 0 && weight > 0;

  const bmr = valid
    ? inputs.gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
    : null;
  const tdee = bmr !== null ? bmr * activity : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
            <Calculator className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Kalorienrechner</CardTitle>
            <CardDescription>Grundumsatz &amp; Tagesbedarf</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          {(["male", "female"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => update({ gender: g })}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                inputs.gender === g
                  ? "border-foreground bg-secondary"
                  : "border-border text-muted-foreground hover:bg-secondary/50"
              )}
            >
              {g === "male" ? "Männlich" : "Weiblich"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cal-age">Alter</Label>
            <Input
              id="cal-age"
              type="number"
              min={0}
              inputMode="numeric"
              value={inputs.age}
              onChange={(e) => update({ age: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cal-height">Größe (cm)</Label>
            <Input
              id="cal-height"
              type="number"
              min={0}
              inputMode="numeric"
              value={inputs.height}
              onChange={(e) => update({ height: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cal-weight">Gewicht (kg)</Label>
            <Input
              id="cal-weight"
              type="number"
              min={0}
              inputMode="decimal"
              value={inputs.weight}
              onChange={(e) => update({ weight: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Aktivitätslevel</Label>
          <div className="flex flex-col gap-1.5">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => update({ activity: level.value })}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  inputs.activity === level.value
                    ? "border-foreground bg-secondary"
                    : "border-border hover:bg-secondary/50"
                )}
              >
                <span className="font-medium">{level.label}</span>
                <span className="text-xs text-muted-foreground">{level.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {bmr !== null && tdee !== null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Grundumsatz (BMR)</p>
              <p className="text-2xl font-semibold tabular-nums">
                {Math.round(bmr)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Tagesbedarf (TDEE)</p>
              <p className="text-2xl font-semibold tabular-nums">
                {Math.round(tdee)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Abnehmen (−500)</p>
              <p className="text-xl font-semibold tabular-nums">
                {Math.round(tdee - 500)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Zunehmen (+300)</p>
              <p className="text-xl font-semibold tabular-nums">
                {Math.round(tdee + 300)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">kcal</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Alter, Größe und Gewicht eingeben, um deinen Bedarf zu berechnen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
