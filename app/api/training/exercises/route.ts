import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { validSlugId } from "@/lib/ids";
import { slugifyExercise } from "@/lib/slugify";
import { currentUserId } from "@/lib/server-user";
import { catalogEntry, fromCatalog, mergeExercises, mergeOne, type ExerciseRecord } from "@/lib/exercise-catalog";
import {
  DEFAULT_BODYWEIGHT_LOAD,
  LADEARTEN,
  type Equipment,
  type Exercise,
  type Ladeart,
  type Muscle,
} from "@/lib/training";
import { UNAUTHORIZED } from "@/lib/api-antworten";

type ExerciseRow = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  is_custom: number;
  hidden: number;
  favorite: number;
  increment: number | null;
  bodyweight_factor: number | null;
  load_factor: number | null;
  warmup: string | null;
  rating: number | null;
  ladeart: string | null;
};

/**
 * Die Zeile so, wie sie in der Datenbank steht. Ob daraus eine eigene Übung
 * wird oder eine Abweichung von einer Katalogübung, entscheidet erst
 * mergeExercises.
 */
function toRecord(row: ExerciseRow): ExerciseRecord {
  return {
    id: row.id,
    name: row.name,
    muscle: row.muscle as Muscle,
    equipment: row.equipment as Equipment,
    isCustom: row.is_custom === 1,
    hidden: row.hidden === 1,
    favorite: row.favorite === 1,
    increment: row.increment,
    bodyweightFactor: row.bodyweight_factor,
    loadFactor: row.load_factor,
    warmup: row.warmup as Exercise["warmup"],
    rating: row.rating,
    // Geprüft statt gecastet: die Spalte ist TEXT und nimmt alles an.
    ladeart: LADEARTEN.includes(row.ladeart as Ladeart) ? (row.ladeart as Ladeart) : null,
  };
}

/** Eine einzelne Übung, gelesen wie die ganze Liste. */
function toExercise(row: ExerciseRow): Exercise {
  return mergeOne(toRecord(row));
}


/** Faustwert für eigene Eigengewichtsübungen — grob ein Liegestütz. */
export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const rows = await d1Query<ExerciseRow>(
    `SELECT id, name, muscle, equipment, is_custom, hidden, favorite, increment, bodyweight_factor, load_factor, warmup, rating, ladeart
       FROM exercises WHERE user_id = ? AND deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC`,
    [userId]
  );
  return NextResponse.json({ exercises: mergeExercises(rows.map(toRecord)) });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    muscle?: string;
    equipment?: string;
    increment?: number | null;
    bodyweightFactor?: number | null;
    loadFactor?: number | null;
    warmup?: string | null;
    favorite?: boolean;
    ladeart?: Ladeart | null;
  };

  const name = body.name?.trim();
  if (!name || !body.muscle || !body.equipment) {
    return NextResponse.json(
      { error: "name, muscle und equipment sind erforderlich" },
      { status: 400 }
    );
  }

  // Siehe habits/route.ts: eine mitgeschickte ID macht das Anlegen wiederholbar.
  let id: string;
  if (body.id !== undefined && body.id !== null) {
    const given = validSlugId(body.id);
    if (!given) return NextResponse.json({ error: "Ungültige id" }, { status: 400 });
    id = given;
  } else {
    const base = slugifyExercise(name);
    const existing = await d1Query<{ id: string }>(
      `SELECT id FROM exercises WHERE user_id = ? AND deleted_at IS NULL AND id LIKE ?`,
      [userId, `${base}%`]
    );
    id = base;
    if (existing.some((e) => e.id === id)) {
      let n = 2;
      while (existing.some((e) => e.id === `${base}-${n}`)) n++;
      id = `${base}-${n}`;
    }
  }

  // Eigengewichtsübungen bewegen den Körper, nicht die Hantel — ohne einen
  // Standardwert stünden sie im Volumen wieder bei null. Anpassbar in der
  // Übungsliste.
  const loadFactor =
    body.loadFactor ?? (body.equipment === "bodyweight" ? DEFAULT_BODYWEIGHT_LOAD : null);

  await d1Query(
    `INSERT INTO exercises (user_id, id, name, muscle, equipment, is_custom, hidden, favorite, increment, bodyweight_factor, load_factor, warmup, ladeart, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, id) DO UPDATE
       SET name = excluded.name, muscle = excluded.muscle, equipment = excluded.equipment,
           increment = excluded.increment, bodyweight_factor = excluded.bodyweight_factor,
           load_factor = excluded.load_factor, warmup = excluded.warmup, favorite = excluded.favorite,
           ladeart = excluded.ladeart,
           hidden = 0, deleted_at = NULL, updated_at = datetime('now')`,
    [
      userId,
      id,
      name,
      body.muscle,
      body.equipment,
      body.favorite ? 1 : 0,
      body.increment ?? null,
      body.bodyweightFactor ?? null,
      loadFactor,
      body.warmup ?? null,
      LADEARTEN.includes(body.ladeart as Ladeart) ? (body.ladeart as Ladeart) : null,
    ]
  );

  const rows = await d1Query<ExerciseRow>(
    `SELECT id, name, muscle, equipment, is_custom, hidden, favorite, increment, bodyweight_factor, load_factor, warmup, rating, ladeart
       FROM exercises WHERE user_id = ? AND deleted_at IS NULL AND id = ?`,
    [userId, id]
  );
  return NextResponse.json({ exercise: toExercise(rows[0]) });
}

export async function PUT(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    muscle?: string;
    equipment?: string;
    increment?: number | null;
    bodyweightFactor?: number | null;
    loadFactor?: number | null;
    warmup?: string | null;
    hidden?: boolean;
    favorite?: boolean;
    rating?: number | null;
    ladeart?: Ladeart | null;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });
  }

  const current = await d1Query<ExerciseRow>(
    `SELECT id, name, muscle, equipment, is_custom, hidden, favorite, increment, bodyweight_factor, load_factor, warmup, rating, ladeart
       FROM exercises WHERE user_id = ? AND deleted_at IS NULL AND id = ?`,
    [userId, body.id]
  );

  // Eine Katalogübung hat erst dann eine Zeile, wenn jemand etwas an ihr
  // verstellt — dieses Verstellen ist genau der Fall hier. Ihre Ausgangswerte
  // kommen deshalb aus dem Katalog statt aus der Datenbank.
  const entry = catalogEntry(body.id);
  const before: ExerciseRow | null =
    current[0] ??
    (entry
      ? (() => {
          const base = fromCatalog(entry);
          return {
            id: base.id,
            name: base.name,
            muscle: base.muscle,
            equipment: base.equipment,
            is_custom: 0,
            hidden: 0,
            favorite: 0,
            increment: base.increment,
            bodyweight_factor: base.bodyweightFactor,
            load_factor: base.loadFactor,
            warmup: base.warmup,
            rating: null,
            ladeart: null,
          };
        })()
      : null);

  if (!before) {
    return NextResponse.json({ error: "Übung nicht gefunden" }, { status: 404 });
  }

  await d1Query(
    `INSERT INTO exercises (user_id, id, name, muscle, equipment, is_custom, hidden, favorite, increment, bodyweight_factor, load_factor, warmup, rating, ladeart, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, id) DO UPDATE
       SET name = excluded.name, muscle = excluded.muscle, equipment = excluded.equipment,
           hidden = excluded.hidden, favorite = excluded.favorite, increment = excluded.increment,
           bodyweight_factor = excluded.bodyweight_factor, load_factor = excluded.load_factor,
           warmup = excluded.warmup, rating = excluded.rating, ladeart = excluded.ladeart,
           deleted_at = NULL, updated_at = datetime('now')`,
    [
      userId,
      body.id,
      body.name?.trim() || before.name,
      body.muscle ?? before.muscle,
      body.equipment ?? before.equipment,
      before.is_custom,
      body.hidden === undefined ? before.hidden : body.hidden ? 1 : 0,
      body.favorite === undefined ? before.favorite : body.favorite ? 1 : 0,
      body.increment === undefined ? before.increment : body.increment,
      body.bodyweightFactor === undefined ? before.bodyweight_factor : body.bodyweightFactor,
      body.loadFactor === undefined ? before.load_factor : body.loadFactor,
      body.warmup === undefined ? before.warmup : body.warmup,
      body.rating === undefined ? before.rating : body.rating,
      body.ladeart === undefined ? before.ladeart : body.ladeart,
    ]
  );

  const rows = await d1Query<ExerciseRow>(
    `SELECT id, name, muscle, equipment, is_custom, hidden, favorite, increment, bodyweight_factor, load_factor, warmup, rating, ladeart
       FROM exercises WHERE user_id = ? AND deleted_at IS NULL AND id = ?`,
    [userId, body.id]
  );
  return NextResponse.json({ exercise: toExercise(rows[0]) });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  // Eine Katalogübung steht im Code, nicht in der Datenbank — löschen lässt
  // sie sich nicht, nur ausblenden. Dafür braucht es unter Umständen erst eine
  // Zeile, die dieses Ausblenden festhält.
  const entry = catalogEntry(id);
  if (entry) {
    const base = fromCatalog(entry);
    await d1Query(
      `INSERT INTO exercises (user_id, id, name, muscle, equipment, is_custom, hidden, favorite, increment, bodyweight_factor, load_factor, warmup, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 1, 0, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, id) DO UPDATE
         SET hidden = 1, deleted_at = NULL, updated_at = datetime('now')`,
      [
        userId,
        base.id,
        base.name,
        base.muscle,
        base.equipment,
        base.increment,
        base.bodyweightFactor,
        base.loadFactor,
        base.warmup,
      ]
    );
    return NextResponse.json({ ok: true, hidden: true });
  }

  // Übungen mit Verlauf werden nur ausgeblendet — sonst verlöre man die Statistik.
  const used = await d1Query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workout_sets WHERE user_id = ? AND exercise_id = ?`,
    [userId, id]
  );
  const inPlans = await d1Query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM plan_exercises WHERE user_id = ? AND exercise_id = ?`,
    [userId, id]
  );

  if ((used[0]?.count ?? 0) > 0 || (inPlans[0]?.count ?? 0) > 0) {
    await d1Query(
      `UPDATE exercises SET hidden = 1, updated_at = datetime('now')
        WHERE user_id = ? AND id = ?`,
      [userId, id]
    );
    return NextResponse.json({ ok: true, hidden: true });
  }

  await d1Query(
    `UPDATE exercises SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
  return NextResponse.json({ ok: true, hidden: false });
}
