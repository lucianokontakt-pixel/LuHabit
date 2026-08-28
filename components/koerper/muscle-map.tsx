"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useBodyProfile } from "@/lib/body-profile";
import {
  MAP_AREAS,
  SILHOUETTE,
  mapLevels,
  setsPerMuscle,
  untrainedMuscles,
} from "@/lib/muscle-map";
import { MUSCLES, MUSCLE_LABELS, type Exercise, type Muscle, type WorkoutSession } from "@/lib/training";
import type { BodyPaths, BodyView } from "@/lib/body-paths";

/**
 * Wie kräftig eine Fläche gefüllt wird. Bewusst ohne Farbe, obwohl hier
 * Muskeln stehen und die App sonst genau dafür Tönungen hat: die Figur sagt
 * schon, welcher Muskel gemeint ist — offen ist nur, wieviel. Dafür ist
 * Deckkraft das richtige Mittel, und Pastell bei 13 Prozent wäre schlicht
 * nicht mehr zu sehen.
 */
const FILL = [0.13, 0.28, 0.45, 0.65, 0.92];
/** Was zur Figur gehört, aber zu keiner Aussage. */
const SILHOUETTE_FILL = 0.06;

/**
 * Die Geometrie ist rund 90 KB und wird nur hier gebraucht, also kommt sie erst
 * beim ersten Zeichnen nach. Der Zwischenspeicher liegt außerhalb der
 * Komponente, damit Vorder- und Rückseite sie sich teilen und ein zweiter
 * Seitenaufruf sie nicht erneut holt.
 */
let cache: BodyPaths | null = null;
let pending: Promise<BodyPaths> | null = null;

function useBodyPaths(): BodyPaths | null {
  const [paths, setPaths] = useState<BodyPaths | null>(cache);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    pending =
      pending ??
      import("@/lib/body-paths").then((m) => {
        cache = m.default;
        return m.default;
      });
    pending.then((p) => alive && setPaths(p)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return paths;
}

function View({
  view,
  levels,
  selected,
  onSelect,
}: {
  view: BodyView;
  levels: Record<string, number>;
  selected: Muscle | null;
  onSelect: (muscle: Muscle | null) => void;
}) {
  // Welche Gruppe zu einer Fläche gehört — für das Antippen die Umkehrung von
  // MAP_AREAS.
  const owner = useMemo(() => {
    const map: Record<string, Muscle> = {};
    for (const { key } of MUSCLES) for (const area of MAP_AREAS[key]) map[area] = key;
    return map;
  }, []);

  return (
    <svg viewBox={view.vb} className="h-auto w-full text-foreground" role="img">
      {SILHOUETTE.flatMap((slug) =>
        (view.p[slug] ?? []).map((d, i) => (
          <path key={`${slug}-${i}`} d={d} fill="currentColor" opacity={SILHOUETTE_FILL} />
        ))
      )}
      {Object.keys(owner).flatMap((slug) =>
        (view.p[slug] ?? []).map((d, i) => {
          const muscle = owner[slug];
          const level = levels[slug] ?? 0;
          const isSelected = selected === muscle;
          return (
            <path
              key={`${slug}-${i}`}
              d={d}
              fill="currentColor"
              opacity={isSelected ? 1 : FILL[level]}
              className="cursor-pointer"
              onClick={() => onSelect(isSelected ? null : muscle)}
            >
              <title>{MUSCLE_LABELS[muscle]}</title>
            </path>
          );
        })
      )}
    </svg>
  );
}

/**
 * Wo die Sätze hingegangen sind — und, der eigentliche Punkt, wo nicht.
 *
 * Die Schattierung ist relativ zum härtesten Muskel im selben Zeitraum: die
 * Karte beantwortet „ist das ausgewogen", nicht „ist das genug". Wie viel genug
 * ist, steht darüber im Korridor 10–20 Sätze pro Woche.
 */
export function MuscleMap({
  sessions,
  exerciseById,
  caption,
}: {
  sessions: WorkoutSession[];
  exerciseById: Record<string, Exercise>;
  caption: string;
}) {
  const paths = useBodyPaths();
  const { profile } = useBodyProfile();
  const [selected, setSelected] = useState<Muscle | null>(null);

  const tally = useMemo(
    () => setsPerMuscle(sessions, exerciseById),
    [sessions, exerciseById]
  );
  const levels = useMemo(() => mapLevels(tally), [tally]);
  const missing = useMemo(() => untrainedMuscles(tally), [tally]);
  const body = paths?.[profile.gender] ?? paths?.male ?? null;

  return (
    <Card className="gap-4">
      <div className="px-(--card-spacing)">
        <h2 className="text-subheading font-display">Körperkarte</h2>
        <p className="text-sm text-muted-foreground">Wo die Sätze hingingen · {caption}</p>
      </div>

      <div className="px-(--card-spacing)">
        {body ? (
          <div className="flex justify-center gap-2">
            <View view={body.front} levels={levels} selected={selected} onSelect={setSelected} />
            <View view={body.back} levels={levels} selected={selected} onSelect={setSelected} />
          </div>
        ) : (
          // Platz freihalten, damit beim Nachladen nichts darunter springt.
          <div className="h-64 animate-pulse rounded-card bg-elevated" />
        )}

        {/* Die Antwort gehört unter die Figur, nicht in den Kopf der Karte:
            wer auf die Brust tippt, schaut auf die Brust. Die Zeile steht auch
            leer, damit beim Antippen nichts springt. */}
        <p className="mt-2 min-h-5 text-center text-sm">
          {selected ? (
            <>
              <span className="font-medium">{MUSCLE_LABELS[selected]}</span>
              <span className="text-muted-foreground">
                {" · "}
                {tally[selected]
                  ? `${tally[selected]} ${tally[selected] === 1 ? "Satz" : "Sätze"}`
                  : "nicht trainiert"}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Tippe eine Muskelgruppe an</span>
          )}
        </p>
      </div>

      {missing.length > 0 ? (
        <div className="flex flex-col gap-2 px-(--card-spacing)">
          <p className="text-xs text-muted-foreground">In diesem Zeitraum nicht trainiert</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((muscle) => (
              <span
                key={muscle}
                className="rounded-pill bg-elevated px-2.5 py-1 text-xs text-muted-foreground"
              >
                {MUSCLE_LABELS[muscle]}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="px-(--card-spacing) text-xs text-muted-foreground">
          Jede Muskelgruppe hat in diesem Zeitraum Arbeit bekommen.
        </p>
      )}

      <div className="flex items-center gap-1.5 px-(--card-spacing) text-[11px] text-muted-foreground">
        Weniger
        {FILL.map((opacity, i) => (
          <span key={i} className="size-3 rounded-[3px] bg-foreground" style={{ opacity }} />
        ))}
        Mehr
      </div>
    </Card>
  );
}
