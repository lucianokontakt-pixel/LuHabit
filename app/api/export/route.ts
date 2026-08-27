import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { currentUserId } from "@/lib/server-user";
import { toCsv } from "@/lib/csv";
import { todayISO } from "@/lib/datum";

/**
 * Datenexport — alles, was einem Konto gehört, zum Mitnehmen.
 *
 * Bewusst als echter Download mit Content-Disposition statt als Blob im
 * Client: so funktioniert es auch in iOS Safari und in der PWA vom
 * Homescreen, wo skriptgesteuerte Downloads gern ins Leere laufen.
 *
 * Das Webhook-Secret bleibt draußen. Es ist ein Schlüssel, keine Messgröße —
 * es hat in einer Datei nichts zu suchen, die man weitergibt oder in einer
 * Cloud ablegt.
 */

const UNAUTHORIZED = { error: "Nicht angemeldet" };

type Row = Record<string, unknown>;

async function collect(userId: string) {
  const [
    user,
    entries,
    bodyProfile,
    exercises,
    plans,
    days,
    planExercises,
    sessions,
    sets,
  ] = await Promise.all([
    d1Query<Row>(`SELECT email, name, created_at FROM users WHERE id = ?`, [userId]),
    d1Query<Row>(
      `SELECT habit, date, value, created_at FROM entries WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY date ASC, habit ASC`,
      [userId]
    ),
    d1Query<Row>(
      `SELECT age, gender, height, activity, updated_at FROM body_profile WHERE user_id = ?`,
      [userId]
    ),
    d1Query<Row>(
      `SELECT id, name, muscle, equipment, is_custom, hidden, increment, bodyweight_factor
         FROM exercises WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
      [userId]
    ),
    d1Query<Row>(
      `SELECT id, name, is_active, position, weekly_target, created_at
         FROM workout_plans WHERE user_id = ? AND deleted_at IS NULL ORDER BY position ASC`,
      [userId]
    ),
    d1Query<Row>(
      `SELECT id, plan_id, name, position, weekday FROM plan_days WHERE user_id = ?
        ORDER BY plan_id ASC, position ASC`,
      [userId]
    ),
    d1Query<Row>(
      `SELECT id, day_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds,
              increment, start_weight
         FROM plan_exercises WHERE user_id = ? ORDER BY day_id ASC, position ASC`,
      [userId]
    ),
    d1Query<Row>(
      `SELECT id, plan_id, day_id, day_name, date, started_at, finished_at,
              duration_seconds, note
         FROM workout_sessions WHERE user_id = ? AND deleted_at IS NULL ORDER BY date ASC, started_at ASC`,
      [userId]
    ),
    d1Query<Row>(
      `SELECT id, session_id, exercise_id, set_index, weight, reps, done, warmup
         FROM workout_sets WHERE user_id = ? ORDER BY session_id ASC, set_index ASC`,
      [userId]
    ),
  ]);

  return {
    user: user[0] ?? null,
    entries,
    bodyProfile: bodyProfile[0] ?? null,
    exercises,
    plans,
    days,
    planExercises,
    sessions,
    sets,
  };
}

function download(body: string, filename: string, contentType: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const data = await collect(userId);
  const stamp = todayISO();

  if (format === "koerper") {
    // Gewicht und Körperfett, eine Zeile je Messung.
    return download(
      toCsv(
        ["messwert", "datum", "wert", "einheit"],
        data.entries.map((e) => [
          e.habit === "weight" ? "Gewicht" : e.habit === "bodyfat" ? "Körperfett" : String(e.habit),
          e.date,
          e.value,
          e.habit === "bodyfat" ? "%" : "kg",
        ])
      ),
      `luhabit-koerper-${stamp}.csv`,
      "text/csv"
    );
  }

  if (format === "training") {
    // Eine Zeile je Satz, mit den Angaben der Einheit daneben — so lässt sich
    // in der Tabelle nach Übung, Tag oder Gewicht sortieren, ohne erst zwei
    // Blätter verbinden zu müssen.
    const sessionById = new Map(data.sessions.map((s) => [s.id, s]));
    const exerciseById = new Map(data.exercises.map((e) => [e.id, e]));

    return download(
      toCsv(
        [
          "datum",
          "tag",
          "uebung",
          "muskel",
          "satz",
          "gewicht_kg",
          "wiederholungen",
          "erledigt",
          "aufwaermsatz",
        ],
        data.sets.map((set) => {
          const session = sessionById.get(set.session_id);
          const exercise = exerciseById.get(set.exercise_id);
          return [
            session?.date ?? "",
            session?.day_name ?? "",
            exercise?.name ?? set.exercise_id,
            exercise?.muscle ?? "",
            Number(set.set_index) + 1,
            set.weight,
            set.reps,
            set.done ? "ja" : "nein",
            set.warmup ? "ja" : "nein",
          ];
        })
      ),
      `luhabit-training-${stamp}.csv`,
      "text/csv"
    );
  }

  return download(
    JSON.stringify({ exportedAt: new Date().toISOString(), schema: 1, ...data }, null, 2),
    `luhabit-export-${stamp}.json`,
    "application/json"
  );
}
