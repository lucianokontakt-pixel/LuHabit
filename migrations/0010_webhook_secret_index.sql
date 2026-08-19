-- Der Webhook löst bei jedem Aufruf das Secret auf ein Konto auf
-- (lib/server-user.ts, userIdForWebhookSecret). Ohne Index ist das ein voller
-- Tabellendurchlauf. UNIQUE stellt zusätzlich sicher, dass ein Secret nie auf
-- zwei Konten zeigt — sonst würde rows[0] stillschweigend eines davon wählen.
-- Mehrere NULL-Werte erlaubt SQLite in einem UNIQUE-Index ausdrücklich, Konten
-- ohne eingerichtetes Secret stören also nicht.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_webhook_secret
  ON users (webhook_secret);
