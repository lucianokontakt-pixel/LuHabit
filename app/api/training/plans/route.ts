import { NextRequest, NextResponse } from "next/server";
import { d1Query, d1InsertMany } from "@/lib/d1";
import type { PlanDay, WorkoutPlan } from "@/lib/training";

type PlanRow = { id: string; name: string; is_active: number; position: number };
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

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loadPlans(): Promise<WorkoutPlan[]> {
  const plans = await d1Query<PlanRow>(
    `SELECT id, name, is_active, position FROM workout_plans ORDER BY position ASC, created_at ASC`
  );
  if (plans.length === 0) return [];

  const days = await d1Query<DayRow>(
    `SELECT id, plan_id, name, position, weekday FROM plan_days ORDER BY position ASC`
  );
  const planExercises = await d1Query<PlanExerciseRow>(
    `SELECT id, day_id, exercise_id, position, sets, rep_min, rep_max, rest_seconds, increment, start_weight
       FROM plan_exercises ORDER BY position ASC`
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
    days: daysByPlan.get(p.id) ?? [],
  }));
}

/** Tage und Übungen eines Plans komplett neu schreiben. */
async function writeDays(planId: string, days: DayInput[]): Promise<void> {
  const existing = await d1Query<{ id: string }>(`SELECT id FROM plan_days WHERE plan_id = ?`, [
    planId,
  ]);
  for (const day of existing) {
    await d1Query(`DELETE FROM plan_exercises WHERE day_id = ?`, [day.id]);
  }
  await d1Query(`DELETE FROM plan_days WHERE plan_id = ?`, [planId]);

  const dayRows: (string | number | null)[][] = [];
  const exerciseRows: (string | number | null)[][] = [];

  days.forEach((day, dayIndex) => {
    const dayId = newId("day");
    dayRows.push([dayId, planId, day.name.trim() || `Tag ${dayIndex + 1}`, dayIndex, day.weekday ?? null]);

    day.exercises.forEach((ex, exIndex) => {
      const repMin = ex.repMin ?? 8;
      const repMax = ex.repMax ?? 12;
      exerciseRows.push([
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

  await d1InsertMany("plan_days", ["id", "plan_id", "name", "position", "weekday"], dayRows);
  await d1InsertMany(
    "plan_exercises",
    [
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

export async function GET() {
  return NextResponse.json({ plans: await loadPlans() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    days?: DayInput[];
    duplicateOf?: string;
  };

  const countRow = await d1Query<{ count: number }>(`SELECT COUNT(*) AS count FROM workout_plans`);
  const position = countRow[0]?.count ?? 0;

  // Duplizieren: Name und Struktur der Vorlage übernehmen.
  let name = body.name?.trim();
  let days: DayInput[] = body.days ?? [];

  if (body.duplicateOf) {
    const plans = await loadPlans();
    const source = plans.find((p) => p.id === body.duplicateOf);
    if (!source) {
      return NextResponse.json({ error: "Vorlage nicht gefunden" }, { status: 404 });
    }
    name = name || `${source.name} (Kopie)`;
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

  const id = newId("plan");
  await d1Query(
    `INSERT INTO workout_plans (id, name, is_active, position) VALUES (?, ?, ?, ?)`,
    [id, name, position === 0 ? 1 : 0, position]
  );
  await writeDays(id, days);

  const plans = await loadPlans();
  return NextResponse.json({ plan: plans.find((p) => p.id === id), plans });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as {
    id?: string;
    name?: string;
    isActive?: boolean;
    days?: DayInput[];
  };

  if (!body.id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  const current = await d1Query<PlanRow>(
    `SELECT id, name, is_active, position FROM workout_plans WHERE id = ?`,
    [body.id]
  );
  if (current.length === 0) {
    return NextResponse.json({ error: "Plan nicht gefunden" }, { status: 404 });
  }

  if (body.isActive) {
    // Genau ein Plan ist aktiv — der bestimmt, was "Training starten" vorschlägt.
    await d1Query(`UPDATE workout_plans SET is_active = 0 WHERE id != ?`, [body.id]);
  }

  await d1Query(`UPDATE workout_plans SET name = ?, is_active = ? WHERE id = ?`, [
    body.name?.trim() || current[0].name,
    body.isActive === undefined ? current[0].is_active : body.isActive ? 1 : 0,
    body.id,
  ]);

  if (body.days) await writeDays(body.id, body.days);

  const plans = await loadPlans();
  return NextResponse.json({ plan: plans.find((p) => p.id === body.id), plans });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });

  const days = await d1Query<{ id: string }>(`SELECT id FROM plan_days WHERE plan_id = ?`, [id]);
  for (const day of days) {
    await d1Query(`DELETE FROM plan_exercises WHERE day_id = ?`, [day.id]);
  }
  await d1Query(`DELETE FROM plan_days WHERE plan_id = ?`, [id]);
  await d1Query(`DELETE FROM workout_plans WHERE id = ?`, [id]);

  // Absolvierte Einheiten bleiben erhalten — sie sind der Verlauf, nicht der Plan.
  const remaining = await loadPlans();
  if (remaining.length > 0 && !remaining.some((p) => p.isActive)) {
    await d1Query(`UPDATE workout_plans SET is_active = 1 WHERE id = ?`, [remaining[0].id]);
  }

  return NextResponse.json({ plans: await loadPlans() });
}
