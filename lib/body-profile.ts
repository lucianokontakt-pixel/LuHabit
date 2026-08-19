"use client";

import { useCallback, useEffect, useState } from "react";

export type Gender = "male" | "female";

export type BodyProfile = {
  age: string;
  gender: Gender;
  height: string;
  weight: string;
  activity: string;
};

export const ACTIVITY_LEVELS = [
  { value: "1.2", label: "Sitzend", hint: "wenig bis keine Bewegung" },
  { value: "1.375", label: "Leicht aktiv", hint: "Sport 1–3× / Woche" },
  { value: "1.55", label: "Moderat aktiv", hint: "Sport 3–5× / Woche" },
  { value: "1.725", label: "Sehr aktiv", hint: "Sport 6–7× / Woche" },
  { value: "1.9", label: "Extrem aktiv", hint: "körperliche Arbeit + Sport" },
];

// Schlüssel bleibt wie gehabt, damit bereits eingegebene Werte erhalten bleiben.
const STORAGE_KEY = "luhabit-calorie-inputs";

export const DEFAULT_PROFILE: BodyProfile = {
  age: "",
  gender: "male",
  height: "",
  weight: "",
  activity: "1.375",
};

export function readBodyProfile(): BodyProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<BodyProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function useBodyProfile() {
  const [profile, setProfile] = useState<BodyProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- liest gespeicherte Werte einmalig beim Mount
    setProfile(readBodyProfile());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<BodyProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Speichern ist ein Komfort-Feature, Fehler dürfen die Eingabe nicht blockieren
      }
      return next;
    });
  }, []);

  return { profile, update, hydrated };
}

/** Mifflin-St Jeor */
export function basalMetabolicRate(p: {
  gender: Gender;
  weight: number;
  height: number;
  age: number;
}): number | null {
  if (!(p.weight > 0 && p.height > 0 && p.age > 0)) return null;
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === "male" ? base + 5 : base - 161;
}

/** Plausible Körpergrößen — schützt vor Tippfehlern wie "65" statt "185". */
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 250;

export function isPlausibleHeight(heightCm: number): boolean {
  return heightCm >= MIN_HEIGHT_CM && heightCm <= MAX_HEIGHT_CM;
}

export function bodyMassIndex(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !isPlausibleHeight(heightCm)) return null;
  return weightKg / (heightCm / 100) ** 2;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Untergewicht";
  if (bmi < 25) return "Normalgewicht";
  if (bmi < 30) return "Übergewicht";
  return "Adipositas";
}
