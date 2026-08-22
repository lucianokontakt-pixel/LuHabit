import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { currentUserId, seedExercises, seedHabits, seedStarterPlan } from "@/lib/server-user";

const UNAUTHORIZED = { error: "Nicht angemeldet" };

/**
 * Was zurückgesetzt werden kann. Bewusst getrennt: die Einrichtung (Ziele,
 * Übungen, Pläne, Profil) ist ersetzbar, der Verlauf ist es nicht. Wer nur
 * aufräumen will, verliert nichts; wer wirklich Tabula rasa will, wählt die
 * Datenknöpfe zusätzlich.
 */
export type ResetScope = "setup" | "habit-entries" | "training-sessions";

const SCOPES: ResetScope[] = ["setup", "habit-entries", "training-sessions"];

/**
 * Setzt die Einrichtung auf den Zustand eines frisch angelegten Kontos:
 * Standard-Habits mit Standardzielen, die vollständige Übungsbibliothek und
 * Push/Pull/Legs als aktiver Plan.
 *
 * Nicht angefasst werden Einträge und Trainingseinheiten. Damit die Statistik
 * lesbar bleibt, überleben selbst angelegte Übungen, zu denen es protokollierte
 * Sätze gibt — ohne sie stünden in alten Einheiten nur noch nackte IDs.
 * Einträge zu selbst angelegten Zielen bleiben ebenfalls liegen: legt man das
 * Ziel erneut an, ist sein Verlauf wieder da.
 */
/**
 * Weich löschen statt entfernen — überall in dieser Datei. Ein Reset läuft nur
 * auf dem Server; ohne Grabstein bliebe er für den Abgleich unsichtbar und die
 * alten Zeilen lägen auf dem Handy für immer weiter herum, ganz gleich, was
 * der Server danach neu anlegt. Dieselbe Regel wie bei jedem anderen Löschen
 * in der App (siehe zum Beispiel app/api/habits/route.ts).
 */
async function softDelete(table: string, userId: string): Promise<void> {
  await d1Query(
    `UPDATE ${table} SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
}

async function resetSetup(userId: string): Promise<void> {
  await softDelete("custom_habits", userId);
  await softDelete("goals", userId);
  await seedHabits(userId);

  // Die Bibliothek wird komplett neu geschrieben. workout_sets verweist nur
  // über die ID auf die Übung, ohne Fremdschlüssel — Löschen und identisches
  // Wiederanlegen lässt den Verlauf also unberührt.
  await d1Query(
    `UPDATE exercises SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND deleted_at IS NULL
        AND (is_custom = 0
             OR id NOT IN (SELECT exercise_id FROM workout_sets WHERE user_id = ?))`,
    [userId, userId]
  );
  await seedExercises(userId);

  // Tage und Übungen eines Plans tragen keinen eigenen Grabstein — sie hängen
  // am Plan und werden immer nur zusammen mit ihm gelesen (siehe write-ops.ts).
  // Ist der Plan selbst weich gelöscht, ist ein Hart-Löschen seiner Kinder
  // unbedenklich; sie waren dem Abgleich ohnehin nie einzeln bekannt.
  const plans = await d1Query<{ id: string }>(
    `SELECT id FROM workout_plans WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  for (const plan of plans) {
    const days = await d1Query<{ id: string }>(
      `SELECT id FROM plan_days WHERE user_id = ? AND plan_id = ?`,
      [userId, plan.id]
    );
    for (const day of days) {
      await d1Query(`DELETE FROM plan_exercises WHERE user_id = ? AND day_id = ?`, [userId, day.id]);
    }
    await d1Query(`DELETE FROM plan_days WHERE user_id = ? AND plan_id = ?`, [userId, plan.id]);
  }
  await softDelete("workout_plans", userId);
  await seedStarterPlan(userId);

  // body_profile hat keinen Grabstein (die Zeile existiert immer genau einmal
  // pro Konto oder gar nicht) — ein Reset schreibt deshalb die Standardwerte
  // zurück, statt die Zeile verschwinden zu lassen. So bekommt der Abgleich
  // eine normale Änderung zu sehen, keine, die er nicht erkennen könnte.
  await d1Query(
    `INSERT INTO body_profile (user_id, age, gender, height, activity, updated_at)
     VALUES (?, NULL, 'male', NULL, '1.375', datetime('now'))
     ON CONFLICT(user_id) DO UPDATE
       SET age = NULL, gender = 'male', height = NULL, activity = '1.375',
           updated_at = datetime('now')`,
    [userId]
  );
}

async function resetHabitEntries(userId: string): Promise<void> {
  await softDelete("entries", userId);
}

async function resetTrainingSessions(userId: string): Promise<void> {
  // workout_sets hängt am selben Grabstein-freien Muster wie plan_exercises —
  // siehe den Kommentar in resetSetup.
  const sessions = await d1Query<{ id: string }>(
    `SELECT id FROM workout_sessions WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  for (const session of sessions) {
    await d1Query(`DELETE FROM workout_sets WHERE user_id = ? AND session_id = ?`, [userId, session.id]);
  }
  await softDelete("workout_sessions", userId);
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { scope?: string };
  const scope = body.scope as ResetScope | undefined;

  if (!scope || !SCOPES.includes(scope)) {
    return NextResponse.json(
      { error: `scope muss einer von ${SCOPES.join(", ")} sein` },
      { status: 400 }
    );
  }

  if (scope === "setup") await resetSetup(userId);
  if (scope === "habit-entries") await resetHabitEntries(userId);
  if (scope === "training-sessions") await resetTrainingSessions(userId);

  return NextResponse.json({ ok: true, scope });
}
