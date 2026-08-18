# LuHabit

Habit-Tracker für Schritte, Wasser, Kaffee und Training — mit Streaks, Wochen-Charts und einer Contribution-Heatmap.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Cloudflare D1 (Datenbank) · Vercel (Hosting)

## Lokal starten

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Ohne gesetzte `CLOUDFLARE_*`-Variablen startet die App trotzdem (Werte bleiben bei 0), Speichern schlägt aber fehl — die Datenbank muss zuerst eingerichtet werden.

## 1. Cloudflare D1 einrichten

```bash
npx wrangler login
npx wrangler d1 create luhabit
```

Der Befehl gibt dir eine `database_id` aus. Schema anwenden:

```bash
npx wrangler d1 execute luhabit --remote --file=./schema.sql
```

Danach in `.env.local` (und später in den Vercel-Projekteinstellungen) eintragen:

- `CLOUDFLARE_ACCOUNT_ID` — im Cloudflare-Dashboard rechts auf der Übersichtsseite
- `CLOUDFLARE_D1_DATABASE_ID` — Ausgabe von `d1 create`, oder `npx wrangler d1 list`
- `CLOUDFLARE_API_TOKEN` — unter **My Profile → API Tokens → Create Token**, Berechtigung „D1 Edit“ für den Account geben

Die App spricht D1 über Cloudflares HTTP-Query-API an (`lib/d1.ts`), nicht über einen Worker — sie läuft komplett auf Vercel.

## 2. Passcode-Schutz (optional)

`APP_PASSCODE` in `.env.local` / Vercel setzen → alle Seiten fragen dann vor dem ersten Zugriff nach diesem Code. Leer lassen = App bleibt offen.

## 3. Schritte automatisch aus der iOS Health-App

Browser können Health-Daten nicht direkt lesen. Lösung: ein iOS-Shortcut, das die Schritte automatisch täglich an die App schickt.

1. `STEPS_WEBHOOK_SECRET` in `.env.local` / Vercel setzen (ein beliebiges langes Zufalls-Secret)
2. Shortcuts-App → neuer Shortcut:
   - Aktion **„Gesundheitsprobe abrufen“** → Schritte, heute
   - Aktion **„URL-Inhalt abrufen“**:
     - URL: `https://DEINE-DOMAIN.vercel.app/api/steps/webhook?secret=DEIN_SECRET`
     - Methode: POST
     - Anfragetext (JSON): `{ "steps": [Schritte-Wert aus Schritt 1] }`
3. Unter **Automation** eine tägliche Automation anlegen (z. B. 22:00 Uhr, oder „App geöffnet“), die diesen Shortcut lautlos ausführt

Bis dahin einfach die Schritte manuell auf der `/steps`-Seite eintragen.

## 4. Deploy auf Vercel

```bash
npx vercel
```

Anschließend im Vercel-Dashboard unter **Settings → Environment Variables** dieselben Variablen wie in `.env.local` eintragen (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_API_TOKEN`, optional `APP_PASSCODE`, `STEPS_WEBHOOK_SECRET`) und neu deployen.
