import { NextRequest, NextResponse } from "next/server";
import { LADEARTEN, REGIONS, type Ladeart, type Region } from "@/lib/training";

/**
 * Schreibt einzelne Felder direkt in lib/exercise-catalog.json — den geteilten
 * Katalog, nicht die Datenbank.
 *
 * Nur im lokalen `next dev` sinnvoll: der Katalog liegt als Datei im Repo, und
 * nur dort gibt es ein beschreibbares Dateisystem. Im Cloudflare-Deploy
 * (opennextjs-cloudflare) gibt es das nicht — die Route bricht dort ab, bevor
 * sie `fs` überhaupt anfasst.
 *
 * Was hier geschrieben wird, gilt für jeden Account: es sind Aussagen über die
 * Übung selbst, nicht über einen Nutzer. Die persönliche Abweichung steht
 * weiterhin in der Datenbank und schlägt diesen Wert (siehe mergeExercises).
 */

/** Welche Felder von Hand gesetzt werden dürfen — und sonst keine. */
type Feld = "ladeart" | "region" | "name";

function gueltig(feld: Feld, wert: unknown): boolean {
  if (wert === null) return feld !== "name";
  switch (feld) {
    case "ladeart":
      return LADEARTEN.includes(wert as Ladeart);
    case "region":
      return REGIONS.some((r) => r.key === (wert as Region));
    case "name":
      return typeof wert === "string" && wert.trim().length > 0;
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Nur lokal verfügbar" }, { status: 404 });
  }

  const body = (await req.json()) as { id?: string; feld?: Feld; wert?: unknown };
  const { id, feld, wert } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  }
  if (feld !== "ladeart" && feld !== "region" && feld !== "name") {
    return NextResponse.json({ error: "unbekanntes Feld" }, { status: 400 });
  }
  if (!gueltig(feld, wert)) {
    return NextResponse.json({ error: `ungültiger Wert für ${feld}` }, { status: 400 });
  }

  const { readFile, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const dateipfad = path.join(process.cwd(), "lib", "exercise-catalog.json");

  const roh = await readFile(dateipfad, "utf8");
  const katalog = JSON.parse(roh) as Array<Record<string, unknown>>;
  const eintrag = katalog.find((e) => e.id === id);
  if (!eintrag) {
    return NextResponse.json({ error: "Übung nicht im Katalog" }, { status: 404 });
  }

  // Eine ausdrückliche Null heißt "wieder offen lassen", nicht "leerer Wert" —
  // der Unterschied zählt, weil der Katalog fehlende Felder als "die Ableitung
  // entscheidet" liest.
  if (wert === null) delete eintrag[feld];
  else eintrag[feld] = typeof wert === "string" ? wert.trim() : wert;

  await writeFile(dateipfad, JSON.stringify(katalog), "utf8");
  return NextResponse.json({ ok: true });
}
