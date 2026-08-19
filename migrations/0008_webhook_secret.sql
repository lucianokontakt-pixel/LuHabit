-- Persönliches Webhook-Secret pro Nutzer, für externe POSTs (z.B. iOS
-- Shortcuts, die Gewicht/Körperfett aus Apple Health an /api/entries/webhook
-- schicken). Lazy generiert beim ersten Aufruf von /einstellungen.
ALTER TABLE users ADD COLUMN webhook_secret TEXT;
