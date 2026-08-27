import type { NextRequest } from "next/server";
import { d1Query, d1InsertMany } from "@/lib/d1";
import { AUTH_COOKIE, OWNER_USER_ID, authConfigured, readSessionCookie } from "@/lib/auth";
import { STARTER_PLAN } from "@/lib/exercise-seed";

export type DbUser = {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
};

/**
 * Die Nutzerkennung für eine Anfrage. Ohne eingerichteten Login (lokale
 * Entwicklung) gilt der Owner — sonst wäre die App ohne Konfiguration
 * unbenutzbar, so wie sie es vor dem Umbau auch war.
 */
export async function currentUserId(req: NextRequest): Promise<string | null> {
  if (!authConfigured()) return OWNER_USER_ID;
  const session = await readSessionCookie(req.cookies.get(AUTH_COOKIE)?.value);
  return session?.uid ?? null;
}

function newUserId(): string {
  return `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/**
 * Meldet ein Google-Konto an: die konfigurierte Owner-Adresse übernimmt den
 * Datenbestand von vor dem Mehrbenutzer-Umbau, alle anderen bekommen ein
 * frisches Konto mit Standard-Habits und der Übungsbibliothek.
 */
export async function upsertGoogleUser(profile: {
  email: string;
  name?: string;
  picture?: string;
}): Promise<DbUser> {
  const email = profile.email.trim().toLowerCase();
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

  const existing = await d1Query<DbUser>(
    `SELECT id, email, name, picture FROM users WHERE email = ?`,
    [email]
  );

  if (existing.length > 0) {
    await d1Query(
      `UPDATE users SET name = ?, picture = ?, last_login_at = datetime('now') WHERE id = ?`,
      [profile.name ?? existing[0].name, profile.picture ?? existing[0].picture, existing[0].id]
    );
    return { ...existing[0], name: profile.name ?? existing[0].name };
  }

  if (ownerEmail && email === ownerEmail) {
    // Der Owner-Datensatz existiert bereits samt Daten — nur die Platzhalter-
    // Adresse wird jetzt durch die echte ersetzt.
    await d1Query(
      `UPDATE users
          SET email = ?, name = ?, picture = ?, provider = 'google', last_login_at = datetime('now')
        WHERE id = ?`,
      [email, profile.name ?? null, profile.picture ?? null, OWNER_USER_ID]
    );
    return {
      id: OWNER_USER_ID,
      email,
      name: profile.name ?? null,
      picture: profile.picture ?? null,
    };
  }

  const id = newUserId();
  await d1Query(
    `INSERT INTO users (id, email, name, picture, provider, last_login_at)
     VALUES (?, ?, ?, ?, 'google', datetime('now'))`,
    [id, email, profile.name ?? null, profile.picture ?? null]
  );
  await provisionNewUser(id);

  return { id, email, name: profile.name ?? null, picture: profile.picture ?? null };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Standard-Habits, Ziele und Starterplan für ein frisches Konto. Die Bausteine
 * sind einzeln aufrufbar, weil /api/reset genau denselben Zustand
 * wiederherstellt — nur eben für ein Konto, das schon existiert.
 *
 * Die Übungsbibliothek fehlt hier absichtlich: sie kommt aus dem Katalog
 * (lib/exercise-catalog.ts) und braucht keine Zeilen in der Datenbank.
 */
export async function provisionNewUser(userId: string): Promise<void> {
  await seedStarterPlan(userId);
}

/**
 * Push/Pull/Legs als aktiver Startplan. Ohne ihn stünde ein frisches Konto vor
 * einem leeren Trainingsbereich — der Plan aus schema.sql gehört nur dem Owner.
 */
export async function seedStarterPlan(userId: string): Promise<void> {
  const planId = newId("plan");
  await d1Query(
    `INSERT INTO workout_plans (user_id, id, name, is_active, position, weekly_target)
     VALUES (?, ?, ?, 1, 0, ?)`,
    [userId, planId, STARTER_PLAN.name, STARTER_PLAN.weeklyTarget]
  );

  const dayRows: (string | number | null)[][] = [];
  const exerciseRows: (string | number | null)[][] = [];

  STARTER_PLAN.days.forEach((day, dayIndex) => {
    const dayId = newId("day");
    dayRows.push([userId, dayId, planId, day.name, dayIndex, null]);
    day.exercises.forEach((ex, exIndex) => {
      exerciseRows.push([
        userId,
        newId("pe"),
        dayId,
        ex.exerciseId,
        exIndex,
        ex.sets,
        ex.repMin,
        ex.repMax,
        ex.rest,
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
    ["user_id", "id", "day_id", "exercise_id", "position", "sets", "rep_min", "rep_max", "rest_seconds"],
    exerciseRows
  );
}

/**
 * Löst ein Webhook-Secret (aus /einstellungen, users.webhook_secret) auf ein
 * Konto auf — für externe Quellen wie iOS Shortcuts, die keine Session haben.
 */
export async function userIdForWebhookSecret(secret: string | null): Promise<string | null> {
  if (!secret) return null;
  const rows = await d1Query<{ id: string }>(`SELECT id FROM users WHERE webhook_secret = ?`, [
    secret,
  ]);
  return rows[0]?.id ?? null;
}
