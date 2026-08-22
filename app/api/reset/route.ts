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
async function resetSetup(userId: string): Promise<void> {
  await d1Query(`DELETE FROM custom_habits WHERE user_id = ?`, [userId]);
  await d1Query(`DELETE FROM goals WHERE user_id = ?`, [userId]);
  await seedHabits(userId);

  // Die Bibliothek wird komplett neu geschrieben. workout_sets verweist nur
  // über die ID auf die Übung, ohne Fremdschlüssel — Löschen und identisches
  // Wiederanlegen lässt den Verlauf also unberührt.
  await d1Query(
    `DELETE FROM exercises
      WHERE user_id = ?
        AND (is_custom = 0
             OR id NOT IN (SELECT exercise_id FROM workout_sets WHERE user_id = ?))`,
    [userId, userId]
  );
  await seedExercises(userId);

  await d1Query(`DELETE FROM plan_exercises WHERE user_id = ?`, [userId]);
  await d1Query(`DELETE FROM plan_days WHERE user_id = ?`, [userId]);
  await d1Query(`DELETE FROM workout_plans WHERE user_id = ?`, [userId]);
  await seedStarterPlan(userId);

  await d1Query(`DELETE FROM body_profile WHERE user_id = ?`, [userId]);
}

async function resetHabitEntries(userId: string): Promise<void> {
  await d1Query(`DELETE FROM entries WHERE user_id = ?`, [userId]);
}

async function resetTrainingSessions(userId: string): Promise<void> {
  await d1Query(`DELETE FROM workout_sets WHERE user_id = ?`, [userId]);
  await d1Query(`DELETE FROM workout_sessions WHERE user_id = ?`, [userId]);
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
