"use client";

import { useCallback, useEffect, useState } from "react";
import type { Exercise } from "@/lib/training";

const STORAGE_KEY = "luhabit-uebungssprache";

export type Uebungssprache = "de" | "en";

/**
 * In welcher Sprache die Übungen heißen.
 *
 * Der Datensatz führt jede Übung deutsch und englisch (siehe
 * scripts/build-repdb-katalog.mjs). Deutsch ist der Standard — die App spricht
 * deutsch, und „Langhantel-Bankdrücken" liest sich für die meisten schneller
 * als „Barbell Bench Press". Wer die englischen Namen gewohnt ist, weil sie im
 * Studio, in Videos und in jedem Programm so heißen, stellt hier um.
 *
 * Gespeichert wie eine Einstellung, nicht wie ein Filter: in localStorage,
 * unter einem eigenen Schlüssel. Dieselbe Bauart wie useShowRare.
 */
export function useUebungssprache(): [Uebungssprache, (sprache: Uebungssprache) => void] {
  const [sprache, setSprache] = useState<Uebungssprache>("de");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- liest die Einstellung einmalig beim Mount
      if (localStorage.getItem(STORAGE_KEY) === "en") setSprache("en");
    } catch {
      // Kein Speicher, kein Problem — dann bleibt es beim Standard
    }
  }, []);

  const waehlen = useCallback((naechste: Uebungssprache) => {
    setSprache(naechste);
    try {
      localStorage.setItem(STORAGE_KEY, naechste);
    } catch {
      // Einstellung gilt dann nur für diese Sitzung
    }
  }, []);

  return [sprache, waehlen];
}

/**
 * Der Name in der gewählten Sprache.
 *
 * Fällt auf den deutschen zurück, wo kein englischer steht: bei selbst
 * angelegten Übungen gibt es nur einen Namen, und der ist der, den jemand
 * getippt hat.
 */
export function uebungsName(exercise: Pick<Exercise, "name" | "en">, sprache: Uebungssprache) {
  return sprache === "en" ? (exercise.en ?? exercise.name) : exercise.name;
}
