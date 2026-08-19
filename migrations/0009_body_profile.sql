-- Körperprofil für den Kalorienrechner: lag bisher nur im localStorage des
-- Browsers (pro Gerät statt pro Konto). Jetzt eine Zeile pro Nutzer, analog
-- zu goals.
CREATE TABLE IF NOT EXISTS body_profile (
  user_id TEXT PRIMARY KEY,
  age INTEGER,
  gender TEXT NOT NULL DEFAULT 'male',
  height REAL,
  activity TEXT NOT NULL DEFAULT '1.375',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
