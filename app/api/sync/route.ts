import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { currentUserId } from "@/lib/server-user";

/**
 * Der ziehende Teil des Abgleichs: "gib mir alles, was sich seit X geändert hat".
 *
 * Bewusst nur ziehend. Geschrieben wird weiter über die bestehenden Routen —
 * die sind idempotent und nehmen IDs vom Client an, die Warteschlange spielt
 * sie also einfach erneut ab. Ein zweiter Schreibpfad hier hätte jede
 * Validierung ein zweites Mal gebraucht, und zwei Pfade, die dasselbe tun,
 * driften mit der Zeit auseinander.
 *
 * Gelöschtes kommt mit. Ein Grabstein ist die einzige Möglichkeit, dem Handy
 * mitzuteilen, dass eine Zeile weg ist — bliebe sie einfach aus, würde das
 * Handy sie für unverändert halten und behalten.
 *
 * Zwei Feinheiten, die leicht zu übersehen sind und still Daten kosten:
 *
 *  1. Der neue Cursor kommt aus der Datenbankuhr, nicht aus der des Servers.
 *     updated_at wird mit SQLites datetime('now') geschrieben; zwei Uhren, die
 *     um Sekundenbruchteile auseinanderliegen, lassen Datensätze durchrutschen.
 *
 *  2. Der Cursor wird VOR dem Lesen genommen und mit >= verglichen, nicht mit >.
 *     datetime('now') hat Sekundenauflösung: ein Schreibvorgang in derselben
 *     Sekunde wie der Cursor wäre bei > für immer verloren. Bei >= kommt ein
 *     Datensatz gelegentlich doppelt — das ist folgenlos, weil das Handy ihn
 *     ohnehin nach ID einsortiert. Doppelt ist harmlos, fehlend nicht.
 *
 *  3. Ein leeres updated_at zählt als "uralt", nicht als "nie". In SQL ergibt
 *     NULL >= irgendwas nämlich NULL, also unwahr — eine Zeile ohne Stempel
 *     wäre unsichtbar, und zwar dauerhaft, auch beim vollständigen Abgleich.
 *     Solche Zeilen entstehen, solange noch eine ältere Fassung der App auf
 *     dieselbe Datenbank schreibt. Genau so ist beim Bauen ein Habit
 *     verschwunden, das über die Live-App angelegt worden war.
 */

const UNAUTHORIZED = { error: "Nicht angemeldet" };

/** Vor Christi Geburt gab es keine Einträge — das holt alles. */
const BEGINNING = "0000-01-01 00:00:00";

/** D1 bindet rund 100 Parameter je Statement. */
const MAX_IDS_PER_QUERY = 80;

type Row = Record<string, unknown>;

/**
 * Kindzeilen zu einer Menge Elternzeilen holen, in Blöcken.
 * Ohne die Blöcke sprengt ein erster vollständiger Abgleich die
 * Parametergrenze, sobald jemand mehr als 80 Einheiten protokolliert hat.
 */
async function childrenFor<T extends Row>(
  sql: (placeholders: string) => string,
  userId: string,
  parentIds: string[]
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < parentIds.length; i += MAX_IDS_PER_QUERY) {
    const chunk = parentIds.slice(i, i + MAX_IDS_PER_QUERY);
    const placeholders = chunk.map(() => "?").join(", ");
    out.push(...(await d1Query<T>(sql(placeholders), [userId, ...chunk])));
  }
  return out;
}

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const sinceParam = req.nextUrl.searchParams.get("since")?.trim();
  const since = sinceParam || BEGINNING;
  const full = !sinceParam;

  // Zuerst die Uhr, dann die Daten — siehe Feinheit 2 oben.
  const clock = await d1Query<{ now: string }>(`SELECT datetime('now') AS now`);
  const now = clock[0]?.now;
  if (!now) {
    return NextResponse.json({ error: "Datenbankuhr nicht lesbar" }, { status: 502 });
  }

  const [entries, exercises, plans, sessions, bodyProfile] =
    await Promise.all([
    d1Query<Row>(
      `SELECT habit, date, value, deleted_at
         FROM entries WHERE user_id = ? AND COALESCE(updated_at, created_at, '0000-01-01 00:00:00') >= ? ORDER BY date ASC`,
      [userId, since]
    ),
    d1Query<Row>(
      `SELECT id, name, muscle, equipment, is_custom, hidden, favorite, increment, bodyweight_factor,
              load_factor, warmup, deleted_at
         FROM exercises WHERE user_id = ? AND COALESCE(updated_at, created_at, '0000-01-01 00:00:00') >= ?`,
      [userId, since]
    ),
    d1Query<Row>(
      `SELECT id, name, is_active, position, weekly_target, created_at, deleted_at
         FROM workout_plans WHERE user_id = ? AND COALESCE(updated_at, created_at, '0000-01-01 00:00:00') >= ? ORDER BY position ASC`,
      [userId, since]
    ),
    d1Query<Row>(
      `SELECT id, plan_id, day_id, day_name, date, duration_seconds, note, started_at, deleted_at
         FROM workout_sessions WHERE user_id = ? AND COALESCE(updated_at, started_at, '0000-01-01 00:00:00') >= ? ORDER BY date DESC`,
      [userId, since]
    ),
    d1Query<Row>(
      `SELECT age, gender, height, activity, updated_at
         FROM body_profile WHERE user_id = ? AND COALESCE(updated_at, '0000-01-01 00:00:00') >= ?`,
      [userId, since]
    ),
  ]);

  // Pläne und Einheiten sind Dokumente: ihre Kindzeilen tragen keine eigenen
  // Zeitstempel, sondern hängen am Elternteil. Für jeden geänderten Elternteil
  // kommt der vollständige Satz Kinder mit — für gelöschte nicht, da wäre es
  // verschwendete Übertragung.
  const livePlanIds = plans.filter((p) => !p.deleted_at).map((p) => String(p.id));
  const liveSessionIds = sessions.filter((s) => !s.deleted_at).map((s) => String(s.id));

  const [planDays, planExercises, sets] = await Promise.all([
    childrenFor<Row>(
      (ph) => `SELECT id, plan_id, name, position, weekday
                 FROM plan_days WHERE user_id = ? AND plan_id IN (${ph}) ORDER BY position ASC`,
      userId,
      livePlanIds
    ),
    childrenFor<Row>(
      (ph) => `SELECT pe.id, pe.day_id, pe.exercise_id, pe.position, pe.sets, pe.rep_min,
                      pe.rep_max, pe.rest_seconds, pe.increment, pe.start_weight
                 FROM plan_exercises pe
                 JOIN plan_days d ON d.id = pe.day_id
                WHERE pe.user_id = ? AND d.plan_id IN (${ph}) ORDER BY pe.position ASC`,
      userId,
      livePlanIds
    ),
    childrenFor<Row>(
      (ph) => `SELECT id, session_id, exercise_id, set_index, weight, reps, done, warmup
                 FROM workout_sets WHERE user_id = ? AND session_id IN (${ph})
                ORDER BY set_index ASC`,
      userId,
      liveSessionIds
    ),
  ]);

  return NextResponse.json({
    now,
    full,
    entries,
    exercises,
    plans,
    planDays,
    planExercises,
    sessions,
    sets,
    bodyProfile: bodyProfile[0] ?? null,
  });
}
