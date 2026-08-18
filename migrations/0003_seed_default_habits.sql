-- Macht die 6 Standard-Habits zu echten custom_habits Zeilen, damit sie
-- über dieselbe API bearbeitbar/löschbar sind wie selbst angelegte Habits.
-- Anwenden mit: npx wrangler d1 execute luhabit --remote --file=./migrations/0003_seed_default_habits.sql

INSERT OR IGNORE INTO custom_habits (id, label, unit, icon, default_goal, quick_add, step, created_at) VALUES
  ('steps', 'Schritte', 'Schritte', 'Footprints', 10000, '[1000,2500,5000]', 500, '2020-01-01 00:00:00'),
  ('water', 'Wasser', 'ml', 'Droplets', 2000, '[250,500,750]', 50, '2020-01-01 00:00:01'),
  ('coffee', 'Kaffee', 'Tassen', 'Coffee', 3, '[1]', 1, '2020-01-01 00:00:02'),
  ('training', 'Training', 'Minuten', 'Dumbbell', 30, '[15,30,45]', 5, '2020-01-01 00:00:03'),
  ('reading', 'Lesen', 'Minuten', 'BookOpen', 20, '[5,10,15]', 5, '2020-01-01 00:00:04'),
  ('writing', 'Schreiben', 'Minuten', 'PenLine', 15, '[5,10,15]', 5, '2020-01-01 00:00:05');
