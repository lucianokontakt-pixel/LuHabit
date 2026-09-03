import { NextRequest, NextResponse } from "next/server";
import { LADEARTEN, type Ladeart } from "@/lib/training";

/**
 * Schreibt eine Ladeart direkt in lib/exercise-catalog.json — den geteilten
 * Katalog, nicht die Datenbank. Nur im lokalen `next dev` sinnvoll: der
 * Katalog liegt als Datei im Repo, und nur dort gibt es ein beschreibbares
 * Dateisystem. Im Cloudflare-Deploy (opennextjs-cloudflare) gibt es das
 * nicht — die Route bricht dort deshalb ab, bevor sie `fs` überhaupt anfasst.
 * Für die einmalige Sichtung von rund 150 unklassifizierten Maschinen, dann
 * per Hand wieder entfernbar.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Nur lokal verfügbar" }, { status: 404 });
  }

  const body = (await req.json()) as { id?: string; ladeart?: Ladeart | null };
  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  }
  if (body.ladeart !== null && !LADEARTEN.includes(body.ladeart as Ladeart)) {
    return NextResponse.json({ error: "ungültige Ladeart" }, { status: 400 });
  }

  const { readFile, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const dateipfad = path.join(process.cwd(), "lib", "exercise-catalog.json");

  const roh = await readFile(dateipfad, "utf8");
  const katalog = JSON.parse(roh) as Array<Record<string, unknown>>;
  const eintrag = katalog.find((e) => e.id === body.id);
  if (!eintrag) {
    return NextResponse.json({ error: "Übung nicht im Katalog" }, { status: 404 });
  }

  if (body.ladeart === null) {
    delete eintrag.ladeart;
  } else {
    eintrag.ladeart = body.ladeart;
  }

  await writeFile(dateipfad, JSON.stringify(katalog), "utf8");
  return NextResponse.json({ ok: true });
}
