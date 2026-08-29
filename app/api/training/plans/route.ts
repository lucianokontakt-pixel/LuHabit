import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1InsertMany } from "@/lib/d1";
import { newId, resolveNewId } from "@/lib/ids";
import { currentUserId } from "@/lib/server-user";
import type { PlanDay, WorkoutPlan } from "@/lib/training";

type PlanRow = {
  id: string;
  name: string;
  is_active: number;
  position: number;
  weekly_target: number | null;
};
type DayRow = {
  id: string;
  plan_id: string;
  name: string;
  position: number;
  weekday: number | null;
};
type PlanExerciseRow = {
  id: string;
  day_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  increment: number | null;
  start_weight: number | null;
};

type DayInput = {
  name: string;
  weekday?: number | null;
  exercises: {
    exerciseId: string;
    sets?: number;
    repMin?: number;
    repMax?: number;
    restSeconds?: number;
    increment?: number | null;
    startWeight?: number | null;
  }[];
};

const UNAUTHORIZED = { error: "Nicht angemeldet" };

async function loadPlans(userId: string): Promise<WorkoutPlan[]> {
  const plans = await d1Query<PlanRow>(
    `SELECT id, name, is_active, position, weekly_target
       FROM workout_plans WHERE user_id = ? AND deleted_at IS NULL ORDER BY position ASC, created_at ASC`,
    [userId]
  );
  if (plans.length === 0) return [];

  const days = await d1Query<DayRow>(
    `SELECT id, plan_id, name, position, weekday
       FROM plan_days WHERE user_id = ? ORDER BY position ASC`,
    [userId]
  );
  const planExercises = await d1Query<PlanExerciseRow>(
    `SELECT id, day_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, increment, start_weight
       FROM plan_exercises WHERE user_id = ? ORDER BY position ASC`,
    [userId]
  );

  const byDay = new Map<string, PlanExerciseRow[]>();
  for (const pe of planExercises) {
    const list = byDay.get(pe.day_id) ?? [];
    list.push(pe);
    byDay.set(pe.day_id, list);
  }

  const daysByPlan = new Map<string, PlanDay[]>();
  for (const d of days) {
    const list = daysByPlan.get(d.plan_id) ?? [];
    list.push({
      id: d.id,
      name: d.name,
      position: d.position,
      weekday: d.weekday,
      exercises: (byDay.get(d.id) ?? []).map((pe) => ({
        id: pe.id,
        exerciseId: pe.exercise_id,
        position: pe.position,
        sets: pe.sets,
        repMin: pe.rep_min,
        repMax: pe.rep_max,
        restSeconds: pe.rest_seconds,
        increment: pe.increment,
        startWeight: pe.start_weight,
      })),
    });
    daysByPlan.set(d.plan_id, list);
  }

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    isActive: p.is_active === 1,
    position: p.position,
    weeklyTarget: p.weekly_target,
    days: daysByPlan.get(p.id) ?? [],
  }));
}

/** Tage und Übungen eines Plans komplett neu schreiben. */
async function writeDays(userId: string, planId: string, days: DayInput[]): Promise<void> {
  const existing = await d1Query<{ id: string }>(
    `SELECT id FROM plan_days WHERE user_id = ? AND plan_id = ?`,
    [userId, planId]
  );
  for (const day of existing) {
    await d1Query(`DELETE FROM plan_exercises WHERE user_id = ? AND day_id = ?`, [userId, day.id]);
  }
  await d1Query(`DELETE FROM plan_days WHERE user_id = ? AND plan_id = ?`, [userId, planId]);

  const dayRows: (string | number | null)[][] = [];
  const exerciseRows: (string | number | null)[][] = [];

  days.forEach((day, dayIndex) => {
    const dayId = newId("day");
    dayRows.push([
      userId,
      dayId,
      planId,
      day.name.trim() || `Tag ${dayIndex + 1}`,
      dayIndex,
      day.weekday ?? null,
    ]);

    day.exercises.forEach((ex, exIndex) => {
      const repMin = ex.repMin ?? 8;
      const repMax = ex.repMax ?? 12;
      exerciseRows.push([
        userId,
        newId("pe"),
        dayId,
        ex.exerciseId,
        exIndex,
        Math.max(1, ex.sets ?? 3),
        Math.max(1, repMin),
        // Obergrenze darf nie unter der Untergrenze liegen, sonst greift die
        // Progression nie und der Live-Modus zeigt widersprüchliche Ziele.
        Math.max(repMin, repMax),
        Math.max(0, ex.restSeconds ?? 120),
        ex.increment ?? null,
        ex.startWeight ?? null,
      ]);
    });
  });

  await d1InsertMany(
    "plan_days",
    ["user_id", "id", "plan_id", "name", "position", "weekday"],
    dayRows
  );
  await d1InsertMany(
    "plan_exercises",
    [
      "user_id",
      "id",
      "day_id",
      "exercise_id",
      "position",
      "sets",
      "rep_min",
      "rep_max",
      "rest_seconds",
      "increment",
      "start_weight",
    ],
    exerciseRows
  );
}

export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  return NextResponse.json({ plans: await loadPlans(userId) });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    days?: DayInput[];
    duplicateOf?: string;
    weeklyTarget?: number | null;
  };

  const countRow = await d1Query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workout_plans WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  const position = countRow[0]?.count ?? 0;

  // Duplizieren: Name und Struktur der Vorlage übernehmen.
  let name = body.name?.trim();
  let days: DayInput[] = body.days ?? [];
  let weeklyTarget = body.weeklyTarget ?? null;

  if (body.duplicateOf) {
    const plans = await loadPlans(userId);
    const source = plans.find((p) => p.id === body.duplicateOf);
    if (!source) {
      return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
    }
    name = name || `${source.name} (Kopie)`;
    weeklyTarget = body.weeklyTarget ?? source.weeklyTarget;
    days = source.days.map((d) => ({
      name: d.name,
      weekday: d.weekday,
      exercises: d.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        repMin: e.repMin,
        repMax: e.repMax,
        restSeconds: e.restSeconds,
        increment: e.increment,
        startWeight: e.startWeight,
      })),
    }));
  }

  if (!name) return NextResponse.json({ error: "name ist erforderlich" }, { status: 400 });

  const id = resolveNewId("plan", body.id);
  if (!id) return NextResponse.json({ error: "Ungültige id" }, { status: 400 });

  await d1Query(
    `INSERT INTO workout_plans (user_id, id, name, is_active, position, weekly_target, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     -- Der Schlüssel ist hier die ID allein (nicht user_id + id wie bei den
     -- anderen Tabellen). Ohne die WHERE-Bedingung könnte ein fremdes Konto
     -- mit einer geratenen ID diese Zeile überschreiben — sobald die IDS vom
     -- Client kommen, wäre das eine offene Tür. Passt der Besitzer nicht,
     -- passiert schlicht nichts.
     ON CONFLICT(id) DO UPDATE
       SET name = excluded.name, is_active = excluded.is_active,
           position = excluded.position, weekly_target = excluded.weekly_target,
           deleted_at = NULL, updated_at = datetime('now')
     WHERE workout_plans.user_id = excluded.user_id`,
    [userId, id, name, position === 0 ? 1 : 0, position, weeklyTarget]
  );
  await writeDays(userId, id, days);

  const plans = await loadPlans(userId);
  return NextResponse.json({ plan: plans.find((p) => p.id === id), plans });
}

export async function PUT(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    isActive?: boolean;
    days?: DayInput[];
    weeklyTarget?: number | null;
  };

  if (!body.id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  const current = await d1Query<PlanRow>(
    `SELECT id, name, is_active, position, weekly_target
       FROM workout_plans WHERE user_id = ? AND deleted_at IS NULL AND id = ?`,
    [userId, body.id]
  );
  if (current.length === 0) {
    return NextResponse.json({ error: "Plan nicht gefunden" }, { status: 404 });
  }

  if (body.isActive) {
    // Genau ein Plan ist aktiv — der bestimmt, was "Training starten" vorschlägt.
    await d1Query(`UPDATE workout_plans SET is_active = 0, updated_at = datetime('now') WHERE user_id = ? AND id != ?`, [
      userId,
      body.id,
    ]);
  }

  await d1Query(
    `UPDATE workout_plans SET name = ?, is_active = ?, weekly_target = ?,
            updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`,
    [
      body.name?.trim() || current[0].name,
      body.isActive === undefined ? current[0].is_active : body.isActive ? 1 : 0,
      body.weeklyTarget === undefined ? current[0].weekly_target : body.weeklyTarget,
      userId,
      body.id,
    ]
  );

  if (body.days) await writeDays(userId, body.id, body.days);

  const plans = await loadPlans(userId);
  return NextResponse.json({ plan: plans.find((p) => p.id === body.id), plans });
}

/**
 * Nur die Bewegung an einem einzelnen Platz austauschen — ohne den Tag oder
 * seine Geschwister-Übungen anzufassen.
 *
 * PUT (und damit writeDays) ersetzt bei jedem Aufruf ALLE Tage und Übungen
 * des Plans durch frische Zeilen mit neuen IDs (siehe writeDays oben). Für
 * einen Tausch aus einer laufenden Einheit heraus ist das der Fehler, der
 * sie zum Absturz bringt: die Einheit merkt sich ihren Tag über dessen ID,
 * und die wäre danach eine andere — "Trainingstag nicht gefunden" mitten im
 * Training. Dieser Weg ändert deshalb ausschließlich exercise_id (und setzt
 * increment/start_weight zurück, dieselbe Regel wie beim Tausch selbst),
 * ohne dass sich irgendeine ID im Plan verschiebt.
 */
export async function PATCH(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = (await req.json()) as {
    dayId?: string;
    planExerciseId?: string;
    exerciseId?: string;
  };

  if (!body.dayId || !body.planExerciseId || !body.exerciseId) {
    return NextResponse.json(
      { error: "dayId, planExerciseId und exerciseId sind erforderlich" },
      { status: 400 }
    );
  }

  const current = await d1Query<{ id: string }>(
    `SELECT pe.id FROM plan_exercises pe
       JOIN plan_days pd ON pd.id = pe.day_id AND pd.user_id = pe.user_id
       JOIN workout_plans wp ON wp.id = pd.plan_id AND wp.user_id = pd.user_id
      WHERE pe.user_id = ? AND pe.id = ? AND pe.day_id = ? AND wp.deleted_at IS NULL`,
    [userId, body.planExerciseId, body.dayId]
  );
  if (current.length === 0) {
    return NextResponse.json({ error: "Übung im Plan nicht gefunden" }, { status: 404 });
  }

  await d1Query(
    `UPDATE plan_exercises SET exercise_id = ?, increment = NULL, start_weight = NULL
       WHERE user_id = ? AND id = ? AND day_id = ?`,
    [body.exerciseId, userId, body.planExerciseId, body.dayId]
  );

  return NextResponse.json({ plans: await loadPlans(userId) });
}

export async function DELETE(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  const days = await d1Query<{ id: string }>(
    `SELECT id FROM plan_days WHERE user_id = ? AND plan_id = ?`,
    [userId, id]
  );
  for (const day of days) {
    await d1Query(`DELETE FROM plan_exercises WHERE user_id = ? AND day_id = ?`, [userId, day.id]);
  }
  await d1Query(`DELETE FROM plan_days WHERE user_id = ? AND plan_id = ?`, [userId, id]);
  await d1Query(`UPDATE workout_plans SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ? AND id = ?`, [userId, id]);

  // Absolvierte Einheiten bleiben erhalten — sie sind der Verlauf, nicht der Plan.
  const remaining = await loadPlans(userId);
  if (remaining.length > 0 && !remaining.some((p) => p.isActive)) {
    await d1Query(`UPDATE workout_plans SET is_active = 1, updated_at = datetime('now') WHERE user_id = ? AND id = ?`, [
      userId,
      remaining[0].id,
    ]);
  }

  return NextResponse.json({ plans: await loadPlans(userId) });
}
