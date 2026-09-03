"use client";

import { useMemo, useState } from "react";
import { CATALOG, type CatalogExercise } from "@/lib/exercise-catalog";
import { ExerciseThumb } from "@/components/training/exercise-media";
import { LADEART_LABELS, RANK_SICHTBAR_AB, type Ladeart } from "@/lib/training";

/**
 * Nur drei der vier Ladearten kommen bei einer als Maschine getaggten Übung
 * überhaupt in Frage — "frei" (lose Hantel) gehört zu Langhantel/Kurzhantel
 * und wäre im Datensatz auch so getaggt, nicht als Maschine.
 */
const MASCHINEN_LADEARTEN: Ladeart[] = ["steck", "scheiben", "ohne"];
import { Button } from "@/components/ui/button";

async function setzeLadeart(id: string, ladeart: Ladeart | null) {
  const res = await fetch("/api/dev/ladeart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ladeart }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "fehlgeschlagen");
}

/**
 * Einmalige Sichtung: rund 150 Maschinen, deren Ladeart der Datensatz nicht
 * kennt (siehe ladeartVon in lib/training.ts), eine nach der anderen mit Bild
 * — schreibt direkt in den Katalog, gilt danach für jeden Account. Sortiert
 * nach Beliebtheit: die Übungen, die tatsächlich in Plänen auftauchen, zuerst.
 */
export function LadeartAbgleich() {
  const offen = useMemo(
    () =>
      [...CATALOG]
        .filter((e) => e.equipment === "machine" && !e.ladeart && e.rank >= RANK_SICHTBAR_AB)
        .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "de")),
    []
  );

  const [erledigt, setErledigt] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const uebrig = offen.filter((e) => !erledigt.has(e.id));
  const aktuell: CatalogExercise | undefined = uebrig[0];

  function ueberspringen() {
    if (!aktuell) return;
    setErledigt((prev) => new Set(prev).add(aktuell.id));
  }

  async function waehlen(ladeart: Ladeart) {
    if (!aktuell || saving) return;
    setSaving(true);
    try {
      await setzeLadeart(aktuell.id, ladeart);
      setErledigt((prev) => new Set(prev).add(aktuell.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Konnte nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  if (!aktuell) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
        <h1 className="text-xl font-medium">Fertig</h1>
        <p className="text-sm text-muted-foreground">
          Alle {offen.length} Maschinen sind durch. Was übersprungen wurde, taucht bei einem
          Neuladen dieser Seite wieder auf.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 p-8">
      <p className="text-xs text-muted-foreground">
        {erledigt.size} / {offen.length} erledigt
      </p>

      <ExerciseThumb exercise={aktuell} animiert className="size-48" />

      <div className="text-center">
        <p className="text-lg font-medium">{aktuell.name}</p>
        <p className="text-sm text-muted-foreground">{aktuell.en}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {MASCHINEN_LADEARTEN.map((art) => (
          <Button key={art} disabled={saving} onClick={() => void waehlen(art)}>
            {LADEART_LABELS[art]}
          </Button>
        ))}
        <Button variant="outline" disabled={saving} onClick={ueberspringen}>
          Keins von beiden — überspringen
        </Button>
      </div>
    </div>
  );
}
