"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readBodyProfile } from "@/lib/local-db";

export type Gender = "male" | "female";

export type BodyProfile = {
  age: string;
  gender: Gender;
  height: string;
  activity: string;
};

export const ACTIVITY_LEVELS = [
  { value: "1.2", label: "Sitzend", hint: "wenig bis keine Bewegung" },
  { value: "1.375", label: "Leicht aktiv", hint: "Sport 1–3× / Woche" },
  { value: "1.55", label: "Moderat aktiv", hint: "Sport 3–5× / Woche" },
  { value: "1.725", label: "Sehr aktiv", hint: "Sport 6–7× / Woche" },
  { value: "1.9", label: "Extrem aktiv", hint: "körperliche Arbeit + Sport" },
];

export const DEFAULT_PROFILE: BodyProfile = {
  age: "",
  gender: "male",
  height: "",
  activity: "1.375",
};

type ProfileResponse = {
  age: number | null;
  gender: Gender;
  height: number | null;
  activity: string;
} | null;

function fromResponse(p: ProfileResponse): BodyProfile {
  if (!p) return DEFAULT_PROFILE;
  return {
    age: p.age !== null ? String(p.age) : "",
    gender: p.gender,
    height: p.height !== null ? String(p.height) : "",
    activity: p.activity,
  };
}

/**
 * Liegt in D1 statt im localStorage: sonst kennen Handy und Laptop
 * unterschiedliche Werte, und beim Cache-Leeren wären sie weg.
 * Schreibt entprellt, damit nicht jeder Tastenanschlag einen Request auslöst.
 */
export function useBodyProfile() {
  const [profile, setProfile] = useState<BodyProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    /**
     * Erst das Netz, dann der lokale Bestand.
     *
     * Der Abgleich legt das Profil längst in IndexedDB ab — ohne diesen
     * Rückgriff blieben BMI und Kalorienbedarf offline auf „—" stehen, obwohl
     * die Werte auf dem Gerät liegen.
     */
    async function load(): Promise<BodyProfile> {
      try {
        const res = await fetch("/api/body-profile");
        if (res.ok) {
          const data = (await res.json()) as { profile: ProfileResponse };
          return fromResponse(data?.profile ?? null);
        }
      } catch {
        // Kein Netz — unten weiter.
      }
      try {
        const local = await readBodyProfile<ProfileResponse>();
        if (local) return fromResponse(local);
      } catch {
        // Kein lokaler Bestand — dann eben die Standardwerte.
      }
      return DEFAULT_PROFILE;
    }

    load().then((next) => {
      if (!active) return;
      setProfile(next);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback((next: BodyProfile) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/body-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: next.age === "" ? null : Number(next.age),
          gender: next.gender,
          height: next.height === "" ? null : Number(next.height),
          activity: next.activity,
        }),
      }).catch(() => {
        // Speichern ist ein Komfort-Feature, ein verpasster Request darf die Eingabe nicht blockieren.
      });
    }, 500);
  }, []);

  const update = useCallback(
    (patch: Partial<BodyProfile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        save(next);
        return next;
      });
    },
    [save]
  );

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
