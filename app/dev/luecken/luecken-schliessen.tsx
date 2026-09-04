"use client";

import { useMemo, useState } from "react";
import { CATALOG, fromCatalog, type CatalogExercise } from "@/lib/exercise-catalog";
import { ExerciseThumb } from "@/components/training/exercise-media";
import { Button } from "@/components/ui/button";
import {
  EQUIPMENT_LABELS,
  LADEART_HINWEISE,
  LADEART_LABELS,
  MUSCLE_LABELS,
  REGIONS,
  RANK_SICHTBAR_AB,
  ladeartVon,
  type Ladeart,
  type Region,
} from "@/lib/training";

type Feld = "ladeart" | "region" | "name";

async function schreiben(id: string, feld: Feld, wert: string | null) {
  const res = await fetch("/api/dev/katalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, feld, wert }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "fehlgeschlagen");
}

/** Die drei Lücken, in der Reihenfolge, in der sie sich lohnen. */
const SCHRITTE = ["region", "ladeart", "doppelt"] as const;
type Schritt = (typeof SCHRITTE)[number];

const TITEL: Record<Schritt, string> = {
  region: "Schulterbereich",
  ladeart: "Ladeart",
  doppelt: "Doppelte Namen",
};

/**
 * Die drei Stellen, an denen der Katalog noch rät oder schweigt — in einem
 * Durchgang.
 *
 * Die Auswahl ist gemessen, nicht vermutet: von 1295 Übungen fehlt 28
 * Schulterübungen der Bereich (vorne/seitlich/hinten), vier Maschinen bleibt
 * die Ladeart auch nach der Ableitung offen, und sechs Namen gibt es zweimal.
 * Alles andere steht.
 *
 * Geschrieben wird in den Katalog, nicht in die Datenbank: das sind Aussagen
 * über die Übung, die für jeden Account gelten.
 */
export function LueckenSchliessen() {
  const [schritt, setSchritt] = useState<Schritt>("region");
  const [erledigt, setErledigt] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  /** Ohne Bereich, obwohl die Muskelgruppe einen kennt. */
  const offeneRegionen = useMemo(
    () =>
      CATALOG.filter((e) => e.muscle === "shoulders" && !e.region).sort(
        (a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "de")
      ),
    []
  );

  /**
   * Ohne Ladeart — und zwar wirklich: `ladeartVon` leitet aus Gerät und Name
   * ab, was sich ableiten lässt (Sled nimmt Scheiben, Smith auch). Übrig
   * bleibt, was niemand raten kann.
   */
  const offeneLadearten = useMemo(
    () =>
      CATALOG.filter((e) => ladeartVon(fromCatalog(e)) === null).sort(
        (a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "de")
      ),
    []
  );

  /** Namen, die es mehrfach gibt — je Gruppe alle Übungen dazu. */
  const doppelte = useMemo(() => {
    const nachName = new Map<string, CatalogExercise[]>();
    for (const e of CATALOG) {
      const liste = nachName.get(e.name) ?? [];
      liste.push(e);
      nachName.set(e.name, liste);
    }
    return [...nachName.values()].filter((liste) => liste.length > 1);
  }, []);

  const uebrig = {
    region: offeneRegionen.filter((e) => !erledigt.has(e.id)),
    ladeart: offeneLadearten.filter((e) => !erledigt.has(e.id)),
    doppelt: doppelte.filter((liste) => !liste.every((e) => erledigt.has(e.id))),
  };

  async function setzen(id: string, feld: Feld, wert: string | null, mitErledigt: string[] = [id]) {
    if (saving) return;
    setSaving(true);
    setFehler(null);
    try {
      await schreiben(id, feld, wert);
      setErledigt((prev) => new Set([...prev, ...mitErledigt]));
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Konnte nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  function ueberspringen(ids: string[]) {
    setErledigt((prev) => new Set([...prev, ...ids]));
  }

  const kopf = (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5">
        {SCHRITTE.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSchritt(s)}
            className={
              "rounded-pill px-3 py-1.5 text-xs transition-colors " +
              (s === schritt
                ? "bg-foreground text-background"
                : "bg-elevated text-muted-foreground hover:bg-foreground/5")
            }
          >
            {TITEL[s]} · {uebrig[s].length}
          </button>
        ))}
      </div>
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
    </div>
  );

  const schulterRegionen = REGIONS.filter((r) => r.muscle === "shoulders");

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 p-6">
      {kopf}

      {schritt === "region" &&
        (uebrig.region[0] ? (
          <Karte
            eintrag={uebrig.region[0]}
            frage="Welcher Teil der Schulter?"
            aktionen={
              <>
                {schulterRegionen.map((r) => (
                  <Button
                    key={r.key}
                    disabled={saving}
                    onClick={() => void setzen(uebrig.region[0].id, "region", r.key as Region)}
                  >
                    {r.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => ueberspringen([uebrig.region[0].id])}
                >
                  Trifft alle drei — offen lassen
                </Button>
              </>
            }
          />
        ) : (
          <Fertig text="Alle Schulterübungen haben einen Bereich." />
        ))}

      {schritt === "ladeart" &&
        (uebrig.ladeart[0] ? (
          <Karte
            eintrag={uebrig.ladeart[0]}
            frage="Wie kommt das Gewicht an das Gerät?"
            aktionen={
              <>
                {(["steck", "scheiben", "ohne"] as Ladeart[]).map((art) => (
                  <Button
                    key={art}
                    disabled={saving}
                    onClick={() => void setzen(uebrig.ladeart[0].id, "ladeart", art)}
                  >
                    {LADEART_LABELS[art]}
                    <span className="ml-1 opacity-60">({LADEART_HINWEISE[art]})</span>
                  </Button>
                ))}
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => ueberspringen([uebrig.ladeart[0].id])}
                >
                  Weiß nicht — überspringen
                </Button>
              </>
            }
          />
        ) : (
          <Fertig text="Keine Übung ohne Ladeart mehr." />
        ))}

      {schritt === "doppelt" &&
        (uebrig.doppelt[0] ? (
          <Dublette
            gruppe={uebrig.doppelt[0]}
            saving={saving}
            onUmbenennen={(id, name) =>
              void setzen(
                id,
                "name",
                name,
                // Erledigt ist die ganze Gruppe erst, wenn ein Name eindeutig
                // ist — der zweite darf so heißen wie bisher.
                uebrig.doppelt[0].map((e) => e.id)
              )
            }
            onUeberspringen={() => ueberspringen(uebrig.doppelt[0].map((e) => e.id))}
          />
        ) : (
          <Fertig text="Keine doppelten Namen mehr." />
        ))}
    </div>
  );
}

function Fertig({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-lg font-medium">Fertig</p>
      <p className="text-sm text-muted-foreground">{text}</p>
      <p className="text-xs text-muted-foreground">
        Übersprungenes taucht bei einem Neuladen wieder auf.
      </p>
    </div>
  );
}

/** Eine Übung mit Bild und Zusatzangaben, darunter die Auswahl. */
function Karte({
  eintrag,
  frage,
  aktionen,
}: {
  eintrag: CatalogExercise;
  frage: string;
  aktionen: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <ExerciseThumb exercise={eintrag} animiert className="size-48" />
      <div className="text-center">
        <p className="text-lg font-medium">{eintrag.name}</p>
        <p className="text-sm text-muted-foreground">
          {MUSCLE_LABELS[eintrag.muscle]} · {EQUIPMENT_LABELS[eintrag.equipment]}
          {eintrag.rank < RANK_SICHTBAR_AB && " · steht nicht in der Standardliste"}
        </p>
      </div>
      <p className="text-sm">{frage}</p>
      <div className="flex flex-wrap justify-center gap-2">{aktionen}</div>
    </div>
  );
}

/**
 * Zwei Übungen mit demselben Namen.
 *
 * Umbenannt wird nur eine — die andere darf heißen, wie sie heißt. Ein
 * Vorschlag steht im Feld, weil das Unterscheidende meistens im Bild sichtbar
 * ist und nicht im Namen: Griffweite, Sitzposition, Steck oder Scheiben.
 */
function Dublette({
  gruppe,
  saving,
  onUmbenennen,
  onUeberspringen,
}: {
  gruppe: CatalogExercise[];
  saving: boolean;
  onUmbenennen: (id: string, name: string) => void;
  onUeberspringen: () => void;
}) {
  const [namen, setNamen] = useState<Record<string, string>>(() =>
    Object.fromEntries(gruppe.map((e) => [e.id, e.name]))
  );

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">
        Zweimal derselbe Name — was unterscheidet die beiden?
      </p>
      <div className="flex w-full flex-col gap-4">
        {gruppe.map((e) => {
          const art = ladeartVon(fromCatalog(e));
          return (
            <div key={e.id} className="flex items-center gap-3 rounded-panel bg-elevated p-3">
              <ExerciseThumb exercise={e} animiert className="size-28" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  {e.id} · {EQUIPMENT_LABELS[e.equipment]}
                  {art ? ` · ${LADEART_LABELS[art]}` : ""}
                </p>
                <input
                  value={namen[e.id]}
                  onChange={(ev) => setNamen((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                  className="w-full rounded-field bg-card px-3 py-2 text-sm"
                />
                <Button
                  size="sm"
                  disabled={saving || namen[e.id].trim() === e.name}
                  onClick={() => onUmbenennen(e.id, namen[e.id])}
                >
                  Diesen umbenennen
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="outline" disabled={saving} onClick={onUeberspringen}>
        Passt so — überspringen
      </Button>
    </div>
  );
}
