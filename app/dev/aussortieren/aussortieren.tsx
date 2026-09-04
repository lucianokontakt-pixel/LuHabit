"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { fetchExercises, updateExercise } from "@/lib/api-training";
import { ExerciseThumb } from "@/components/training/exercise-media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/training/filter-sheet";
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLES,
  istAusgeblendet,
  type Equipment,
  type Exercise,
  type Muscle,
} from "@/lib/training";
import { guete, suchwoerter } from "@/lib/exercise-suche";
import { cn } from "@/lib/utils";

/**
 * Ein Raster aller Übungen zum Durchklicken statt einer Liste zum Durchlesen —
 * bei 1295 Einträgen sagt ein Bild mehr als ein Name. Ausgewähltes wird per
 * Sammelaktion ausgeblendet (taste -1), genau wie ein einzelner Wisch in der
 * Bibliothek — nur für viele auf einmal.
 *
 * Bereits ausgeblendete (persönlich oder aus dem Katalog) stehen hier gar
 * nicht erst: sie noch einmal auszublenden wäre ohne Wirkung.
 */
/** Woher der Katalog-Schreibzugriff geht — dieselbe Route wie luecken-schliessen. */
async function schreibeKatalogfeld(id: string, feld: "equipment", wert: Equipment) {
  const res = await fetch("/api/dev/katalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, feld, wert }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "fehlgeschlagen");
}

export function Aussortieren() {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [geraetBusy, setGeraetBusy] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  // Das Gerät, mit dem eine Übung geladen wurde — damit "Körpergewicht"
  // rückgängig zu machen ist, ohne dass die Ableitung (wie bei ladeart/region)
  // etwas anderes vorschlägt. Ein Katalogfeld wie equipment hat keine
  // Ableitung, auf die man zurückfallen könnte.
  const [urspruenglich, setUrspruenglich] = useState<Map<string, Equipment>>(new Map());

  useEffect(() => {
    fetchExercises()
      .then((liste) => {
        setExercises(liste);
        setUrspruenglich(new Map(liste.map((e) => [e.id, e.equipment])));
      })
      .catch((e) => setFehler(e instanceof Error ? e.message : "Konnte Übungen nicht laden"));
  }, []);

  const gesucht = useMemo(() => suchwoerter(query), [query]);

  const sichtbar = useMemo(() => {
    if (!exercises) return [];
    return exercises
      .filter((e) => !istAusgeblendet(e))
      .filter((e) => (muscle === null ? true : e.muscle === muscle))
      .filter((e) => (equipment === null ? true : e.equipment === equipment))
      .filter((e) => guete(e, gesucht, query) > 0);
  }, [exercises, muscle, equipment, gesucht, query]);

  const gruppiert = useMemo(() => {
    const map = new Map<Muscle, Exercise[]>();
    for (const e of sichtbar) {
      const liste = map.get(e.muscle) ?? [];
      liste.push(e);
      map.set(e.muscle, liste);
    }
    for (const liste of map.values()) liste.sort((a, b) => a.name.localeCompare(b.name, "de"));
    return MUSCLES.map((m) => ({ key: m.key, label: m.label, items: map.get(m.key) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [sichtbar]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * Als Körpergewichtsübung markieren — oder zurück auf das Gerät, mit dem
   * die Übung geladen wurde. Schreibt in den Katalog, nicht in die Datenbank:
   * das Gerät ist eine Tatsache über die Übung, nicht über einen Account
   * (siehe app/api/dev/katalog/route.ts).
   */
  async function toggleKoerpergewicht(exercise: Exercise) {
    if (geraetBusy) return;
    const naechstes: Equipment =
      exercise.equipment === "bodyweight" ? (urspruenglich.get(exercise.id) ?? "other") : "bodyweight";
    setGeraetBusy(exercise.id);
    setFehler(null);
    try {
      await schreibeKatalogfeld(exercise.id, "equipment", naechstes);
      setExercises(
        (prev) => prev?.map((e) => (e.id === exercise.id ? { ...e, equipment: naechstes } : e)) ?? prev
      );
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Konnte Gerät nicht ändern");
    } finally {
      setGeraetBusy(null);
    }
  }

  async function ausblenden() {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    setFehler(null);
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => updateExercise({ id, taste: -1 })));
      const idSet = new Set(ids);
      setExercises((prev) => prev?.filter((e) => !idSet.has(e.id)) ?? prev);
      setSelected(new Set());
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Konnte nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  if (!exercises) {
    return <p className="p-6 text-sm text-muted-foreground">Lädt …</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-border bg-background p-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Übung suchen"
            className="flex-1"
          />
          <FilterSelect
            label="Muskelgruppe"
            allLabel="Alle Muskeln"
            value={muscle}
            options={MUSCLES.map((m) => ({ value: m.key, label: m.label }))}
            onChange={setMuscle}
          />
          <FilterSelect
            label="Gerät"
            allLabel="Alle Geräte"
            value={equipment}
            options={EQUIPMENT.map((key) => ({ value: key, label: EQUIPMENT_LABELS[key] }))}
            onChange={setEquipment}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {sichtbar.length} Übungen{selected.size > 0 && ` · ${selected.size} ausgewählt`}
        </p>
        {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      </div>

      <div className="flex flex-col gap-6 px-4">
        {gruppiert.map((g) => (
          <section key={g.key} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {g.label} · {g.items.length}
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {g.items.map((e) => {
                const ist = selected.has(e.id);
                const koerpergewicht = e.equipment === "bodyweight";
                return (
                  <div
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(e.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        toggle(e.id);
                      }
                    }}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-1 rounded-md p-1 text-left",
                      ist && "ring-2 ring-destructive"
                    )}
                  >
                    <ExerciseThumb
                      exercise={e}
                      className={cn("aspect-square w-full", ist && "opacity-40")}
                    />
                    {ist && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <X className="size-8 text-destructive" strokeWidth={3} />
                      </div>
                    )}
                    <span className="line-clamp-2 w-full text-center text-[10px] text-muted-foreground">
                      {e.name}
                    </span>
                    <button
                      type="button"
                      disabled={geraetBusy === e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void toggleKoerpergewicht(e);
                      }}
                      className={cn(
                        "w-full rounded-pill px-1 py-0.5 text-[9px] transition-colors",
                        koerpergewicht
                          ? "bg-foreground text-background"
                          : "bg-elevated text-muted-foreground hover:bg-foreground/10"
                      )}
                    >
                      Körpergewicht
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-border bg-background p-4">
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Auswahl aufheben
          </Button>
          <Button disabled={saving} onClick={() => void ausblenden()}>
            {saving ? "Blende aus …" : `${selected.size} ausblenden`}
          </Button>
        </div>
      )}
    </div>
  );
}
