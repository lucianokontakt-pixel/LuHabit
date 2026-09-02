import { NextRequest, NextResponse } from "next/server";
import { d1Query } from "@/lib/d1";
import { currentUserId } from "@/lib/server-user";
import type { Gender } from "@/lib/body-profile";
import { UNAUTHORIZED } from "@/lib/api-antworten";

type ProfileRow = {
  age: number | null;
  gender: Gender;
  height: number | null;
  activity: string;
};


export async function GET(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const rows = await d1Query<ProfileRow>(
    `SELECT age, gender, height, activity FROM body_profile WHERE user_id = ?`,
    [userId]
  );

  return NextResponse.json({ profile: rows[0] ?? null });
}

export async function PUT(req: NextRequest) {
  const userId = await currentUserId(req);
  if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const age = body.age === null || body.age === undefined ? null : Number(body.age);
  const gender: Gender = body.gender === "female" ? "female" : "male";
  const height = body.height === null || body.height === undefined ? null : Number(body.height);
  const activity = typeof body.activity === "string" ? body.activity : "1.375";

  if (age !== null && !Number.isFinite(age)) {
    return NextResponse.json({ error: "age muss eine Zahl sein" }, { status: 400 });
  }
  if (height !== null && !Number.isFinite(height)) {
    return NextResponse.json({ error: "height muss eine Zahl sein" }, { status: 400 });
  }

  await d1Query(
    `INSERT INTO body_profile (user_id, age, gender, height, activity, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       age = excluded.age, gender = excluded.gender,
       height = excluded.height, activity = excluded.activity,
       updated_at = excluded.updated_at`,
    [userId, age, gender, height, activity]
  );

  return NextResponse.json({ profile: { age, gender, height, activity } });
}
