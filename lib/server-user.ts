import type { NextRequest } from "next/server";
import { d1Query, d1InsertMany } from "@/lib/d1";
import { AUTH_COOKIE, OWNER_USER_ID, authConfigured, readSessionCookie } from "@/lib/auth";
import { DEFAULT_HABIT_SUGGESTIONS } from "@/lib/habits";
import { SEED_EXERCISES } from "@/lib/exercise-seed";
import { nameForIcon } from "@/lib/habits";

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

/** Standard-Habits, Ziele und die Übungsbibliothek für ein frisches Konto. */
export async function provisionNewUser(userId: string): Promise<void> {
  const now = new Date();

  await d1InsertMany(
    "custom_habits",
    ["user_id", "id", "label", "unit", "icon", "default_goal", "quick_add", "step", "kind", "created_at"],
    DEFAULT_HABIT_SUGGESTIONS.map((habit, index) => [
      userId,
      habit.type,
      habit.label,
      habit.unit,
      nameForIcon(habit.icon),
      habit.defaultGoal,
      JSON.stringify(habit.quickAdd),
      habit.step,
      habit.kind,
      // Reihenfolge der Karten ergibt sich aus created_at.
      new Date(now.getTime() + index * 1000).toISOString().replace("T", " ").slice(0, 19),
    ])
  );

  await d1InsertMany(
    "goals",
    ["user_id", "habit", "target"],
    DEFAULT_HABIT_SUGGESTIONS.map((habit) => [userId, habit.type, habit.defaultGoal])
  );

  // Jedes Konto bekommt eine eigene Kopie der Bibliothek, damit Ausblenden
  // und eigene Anpassungen niemanden sonst betreffen.
  await d1InsertMany(
    "exercises",
    ["user_id", "id", "name", "muscle", "equipment", "is_custom", "hidden", "bodyweight_factor"],
    SEED_EXERCISES.map((e) => [userId, e.id, e.name, e.muscle, e.equipment, 0, 0, e.factor])
  );
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const rows = await d1Query<DbUser>(
    `SELECT id, email, name, picture FROM users WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
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
