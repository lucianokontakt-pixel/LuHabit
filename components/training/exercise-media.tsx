"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  bildUrl,
  geraetBildUrl,
  ladeUebungstext,
  muskelBildUrl,
  type Uebungstext,
} from "@/lib/exercise-catalog";
import { muskelName, tagName, zielName } from "@/lib/repdb-begriffe";
import {
  EQUIPMENT_LABELS,
  KATEGORIE_LABELS,
  LADEART_LABELS,
  MECHANIK_LABELS,
  MUSCLE_LABELS,
  SCHWIERIGKEIT_LABELS,
  ZUGART_LABELS,
  ladeartVon,
  type Exercise,
} from "@/lib/training";
import { useUebungssprache } from "@/lib/uebungssprache";
import { cn } from "@/lib/utils";

/** Was `ExerciseThumb` und `ExerciseDetail` von einer Übung brauchen. */
type MitBild = Pick<Exercise, "id" | "name" | "media" | "bilder">;

/**
 * Wie lange eine Position stehen bleibt, bevor die andere kommt.
 *
 * 1,1 Sekunden ist keine Geschmacksfrage: schneller liest man die zwei Bilder
 * als Flackern statt als Bewegung, langsamer wartet man darauf. Das alte GIF
 * lief mit rund einer Sekunde je Wiederholung — dieselbe Größenordnung, nur
 * mit zwei Bildern statt dreißig.
 */
const TAKT = 1100;

/**
 * Das Bild in Listen. Bewusst nur die Startposition: bei 601 Übungen liefen
 * sonst Dutzende Überblendungen gleichzeitig, sobald jemand scrollt.
 *
 * Ausnahme über `animiert`: die eine Übung, die gerade offen ist, darf sich
 * bewegen. Sie wechselt zwischen Start und Umkehrpunkt — die zwei Positionen,
 * die der Datensatz liefert. Wo es nur ein Bild gibt (134 Übungen, meist
 * Ausdauer), bleibt es dabei.
 */
export function ExerciseThumb({
  exercise,
  className,
  animiert = false,
}: {
  exercise: MitBild;
  className?: string;
  animiert?: boolean;
}) {
  const hatZwei = exercise.bilder.length > 1;
  const [peak, setPeak] = useState(false);

  useEffect(() => {
    if (!animiert || !hatZwei) return;
    const timer = setInterval(() => setPeak((v) => !v), TAKT);
    return () => clearInterval(timer);
  }, [animiert, hatZwei]);

  const start = bildUrl(exercise, "start");
  const zweites = hatZwei ? bildUrl(exercise, "peak") : null;

  return (
    <div
      className={cn(
        // bg-elevated, nicht bg-muted: --muted und --card tragen denselben
        // Wert (#f2f2f3), die Fläche wäre in einer Karte also unsichtbar —
        // eine Übung ohne Bild hinterließe dort ein Loch statt eines Platzes.
        "relative size-20 shrink-0 overflow-hidden rounded-md bg-elevated",
        className
      )}
    >
      {start ? (
        <>
          <Image
            src={start}
            alt=""
            fill
            sizes="160px"
            loading="lazy"
            className={cn(
              "object-cover transition-opacity duration-300",
              peak && zweites ? "opacity-0" : "opacity-100"
            )}
            unoptimized
          />
          {zweites && (
            <Image
              src={zweites}
              alt=""
              fill
              sizes="160px"
              loading="lazy"
              className={cn(
                "object-cover transition-opacity duration-300",
                peak ? "opacity-100" : "opacity-0"
              )}
              unoptimized
            />
          )}
        </>
      ) : (
        <Dumbbell className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
}

/**
 * Ein Muskel mit seinem Bild.
 *
 * Der Datensatz bringt 27 Illustrationen mit, eine je Muskel — und
 * "gluteus_maximus" ist als Wort eine Vokabel, als Bild eine Auskunft. Fehlt
 * eine Datei (der Lendenmuskel hat keine), bleibt der Name allein stehen:
 * Wichtiger als das Bild ist, dass die Angabe nicht verschwindet.
 */
function MuskelKachel({ muskel, gross = false }: { muskel: string; gross?: boolean }) {
  const [fehlt, setFehlt] = useState(false);
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-pill py-1 pr-2.5 pl-1",
        gross ? "bg-tint-mint text-tint-mint-ink" : "bg-elevated text-muted-foreground"
      )}
    >
      {!fehlt && (
        <span className="relative size-6 shrink-0 overflow-hidden rounded-pill bg-white">
          <Image
            src={muskelBildUrl(muskel)}
            alt=""
            fill
            sizes="24px"
            className="object-cover"
            unoptimized
            onError={() => setFehlt(true)}
          />
        </span>
      )}
      <span className={cn("text-xs", gross && "font-medium")}>{muskelName(muskel)}</span>
    </span>
  );
}

/**
 * Die Übung in groß, mit allem, was der Datensatz über sie weiß.
 *
 * Diesen Dialog gab es schon einmal — damals enthielt er ein Bild und sonst
 * nichts, hing am Antippen des Vorschaubilds und flog deshalb raus („kein
 * Popup mehr"). Er kommt zurück, weil sich das Verhältnis umgedreht hat: mit
 * RepDB gibt es eine deutsche Anleitung, Tipps und eine Beschreibung zu jeder
 * der 601 Übungen. Und er hängt jetzt an einem eigenen Knopf, nicht am Bild.
 */
export function ExerciseDetail({
  exercise,
  onOpenChange,
  koerpergewicht = null,
}: {
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
  /** Für die Kalorienschätzung. Ohne Messwert bleibt sie ungesagt. */
  koerpergewicht?: number | null;
}) {
  // Der Text liegt bei der Übungs-ID: sonst stünde nach dem Wechsel für einen
  // Moment die Anleitung der vorigen Übung unter dem neuen Bild.
  const [text, setText] = useState<{ id: string; inhalt: Uebungstext | null } | null>(null);
  const inhalt = text && text.id === exercise?.id ? text.inhalt : null;
  const [sprache] = useUebungssprache();
  const [geraetFehlt, setGeraetFehlt] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    let aktuell = true;
    const id = exercise.id;
    void ladeUebungstext(id, sprache).then((geladen) => {
      if (aktuell) setText({ id, inhalt: geladen });
    });
    return () => {
      aktuell = false;
    };
  }, [exercise, sprache]);

  if (!exercise) return null;
  const art = ladeartVon(exercise);
  const geraetBild = geraetBildUrl(exercise);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-3 overflow-y-auto sm:max-w-md">
        <DialogTitle className="pr-8 text-subheading font-display">{exercise.name}</DialogTitle>

        {/* Beide Positionen nebeneinander statt überblendet: hier ist Platz,
            und wer die Ausführung nachlesen will, vergleicht sie lieber, als
            auf den richtigen Moment zu warten. */}
        <div className="flex gap-2">
          {exercise.bilder.map((bildart) => {
            const src = bildUrl(exercise, bildart);
            if (!src) return null;
            return (
              <div
                key={bildart}
                /* bg-white, nicht bg-muted: die Illustrationen sind selbst weiß
                   hinterlegt, nicht transparent — auf grauem Grund stünde ein
                   sichtbarer Rand um jedes Bild. */
                className="relative aspect-square flex-1 overflow-hidden rounded-panel bg-white"
              >
                <Image
                  src={src}
                  alt={bildart === "peak" ? "Umkehrpunkt" : "Ausgangsposition"}
                  fill
                  sizes="256px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            );
          })}
        </div>

        {/* Die harten Fakten in einer Zeile. Was der Datensatz nicht weiß —
            bei einer eigenen Übung ist das alles außer Muskel und Gerät —,
            fällt einfach weg, statt als Lücke dazustehen. */}
        <p className="text-xs text-muted-foreground">
          {[
            MUSCLE_LABELS[exercise.muscle],
            EQUIPMENT_LABELS[exercise.equipment],
            art ? LADEART_LABELS[art] : null,
            exercise.mechanik ? MECHANIK_LABELS[exercise.mechanik] : null,
            exercise.zugArt ? ZUGART_LABELS[exercise.zugArt] : null,
            exercise.schwierigkeit ? SCHWIERIGKEIT_LABELS[exercise.schwierigkeit] : null,
            exercise.kategorie && exercise.kategorie !== "strength"
              ? KATEGORIE_LABELS[exercise.kategorie]
              : null,
            exercise.einseitig ? "einseitig" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {inhalt?.beschreibung && <p className="text-sm">{inhalt.beschreibung}</p>}

        {/* Welche Muskeln arbeiten — mit Bild, weil ein Muskelname ohne Bild
            eine Vokabel ist. Der primäre größer als die Helfer: die Größe
            sagt, worum es geht, bevor man liest. */}
        {exercise.primaerMuskeln.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">Was arbeitet</p>
            <div className="flex flex-wrap gap-2">
              {exercise.primaerMuskeln.map((m) => (
                <MuskelKachel key={m} muskel={m} gross />
              ))}
              {exercise.sekundaerMuskeln.map((m) => (
                <MuskelKachel key={m} muskel={m} />
              ))}
            </div>
          </div>
        )}

        {inhalt && inhalt.anleitung.length > 0 && (
          <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-sm text-muted-foreground marker:text-xs">
            {inhalt.anleitung.map((schritt, i) => (
              <li key={i} className="pl-1">
                {schritt}
              </li>
            ))}
          </ol>
        )}

        {inhalt && inhalt.tipps.length > 0 && (
          <div className="rounded-panel bg-elevated p-3">
            <p className="mb-1.5 text-xs font-medium">Worauf es ankommt</p>
            <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground">
              {inhalt.tipps.map((tipp, i) => (
                <li key={i} className="pl-1">
                  {tipp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(exercise.ziele.length > 0 || exercise.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {/* Ziele zuerst und in der Akzentfarbe: sie beantworten „wofür
                mache ich das", die Schlagworte nur „was sollte ich wissen". */}
            {exercise.ziele.map((ziel) => (
              <span
                key={ziel}
                className="rounded-pill bg-tint-violet px-2 py-0.5 text-[11px] font-medium text-tint-violet-ink"
              >
                {zielName(ziel)}
              </span>
            ))}
            {exercise.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-pill bg-elevated px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tagName(tag)}
              </span>
            ))}
          </div>
        )}

        {(geraetBild || exercise.met !== null) && (
          <div className="flex items-center gap-3 rounded-panel bg-elevated p-3">
            {geraetBild && !geraetFehlt && (
              <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-white">
                <Image
                  src={geraetBild}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain"
                  unoptimized
                  onError={() => setGeraetFehlt(true)}
                />
              </span>
            )}
            <p className="text-xs text-muted-foreground">
              {EQUIPMENT_LABELS[exercise.equipment]}
              {exercise.met !== null && (
                <>
                  {" · "}
                  {/* MET × Körpergewicht = Kilokalorien je Stunde. Ohne
                      gemessenes Gewicht wäre jede Zahl erfunden, deshalb steht
                      dann nur der Faktor selbst da. */}
                  <span className="nums">
                    {koerpergewicht
                      ? `${Math.round((exercise.met * koerpergewicht) / 60)} kcal/min`
                      : `MET ${exercise.met}`}
                  </span>
                </>
              )}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
