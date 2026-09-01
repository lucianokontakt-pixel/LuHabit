"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "luhabit-ungewoehnliche";

/**
 * Ob die Bibliothek auch die ungewöhnlichen Übungen zeigt — Stufe 1 und 2,
 * also Gymnastikbälle, die meisten Bänder, Dehnübungen und Faszienrollen.
 *
 * Bewusst gespeichert und bewusst geteilt zwischen Bibliothek und
 * Übungswähler: das ist keine Suche, die man je Aufruf neu stellt, sondern
 * eine Haltung dazu, was einem überhaupt angeboten werden soll. Sie zweimal
 * einstellen zu müssen — und nach jedem Schließen des Wählers erneut — wäre
 * genau die Sorte Arbeit, die eine App abnehmen sollte.
 *
 * Dieselbe Machart wie die Toneinstellung in lib/use-signal-sound.ts.
 */
export function useShowRare(): [boolean, () => void] {
  const [showRare, setShowRare] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- liest die Einstellung einmalig beim Mount
      if (localStorage.getItem(STORAGE_KEY) === "1") setShowRare(true);
    } catch {
      // Kein Speicher, kein Problem — dann bleibt es beim Standard
    }
  }, []);

  const toggle = useCallback(() => {
    setShowRare((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Einstellung gilt dann nur für diese Sitzung
      }
      return next;
    });
  }, []);

  return [showRare, toggle];
}
