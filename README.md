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

## 2. Anmeldung

LuHabit ist mehrbenutzerfähig: jedes Konto sieht nur seine eigenen Habits,
Pläne und Trainingseinheiten. Ohne gesetzte `GOOGLE_CLIENT_ID` **und** ohne
`APP_PASSCODE` bleibt die App offen und alle Zugriffe laufen auf das
Owner-Konto — praktisch lokal, in Produktion sollte mindestens eines gesetzt
sein.

### Google-Login einrichten

1. [Google Cloud Console](https://console.cloud.google.com/) öffnen und ein
   Projekt anlegen (oder ein bestehendes wählen).
2. **APIs & Dienste → OAuth-Zustimmungsbildschirm**: Nutzertyp *Extern*,
   App-Name und Support-Mail eintragen. Solange die App im Status *Testing*
   ist, dürfen sich nur die dort eingetragenen Testnutzer anmelden.
3. **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID**,
   Anwendungstyp *Webanwendung*.
4. Bei **Autorisierte Weiterleitungs-URIs** eintragen — beide, damit lokal und
   live derselbe Client funktioniert:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://luhabit.luhabit.workers.dev/api/auth/google/callback`
5. Client-ID und Client-Secret nach `.env.local` kopieren.

### Variablen

| Variable | Zweck |
| --- | --- |
| `AUTH_SECRET` | Signiert die Sitzungs-Cookies. Mindestens 16 Zeichen, erzeugen mit `openssl rand -base64 32`. **Pflicht**, sobald eine Anmeldung eingerichtet ist. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Aus der Google Cloud Console. |
| `APP_URL` | Öffentliche Adresse, bestimmt die Redirect-URI. Lokal leer lassen. |
| `OWNER_EMAIL` | Diese Adresse übernimmt beim ersten Login den Datenbestand von vor dem Mehrbenutzer-Umbau. |
| `ALLOWED_EMAILS` | Optional, kommagetrennt. Gesetzt = nur diese Adressen dürfen sich anmelden. Leer = offene Registrierung. |
| `APP_PASSCODE` | Notfall-Zugang ohne Google, meldet immer als Owner an. |

Sitzungen liegen als signiertes Cookie (HMAC-SHA256), nicht in der Datenbank —
die Middleware kommt so ohne Datenbankzugriff pro Request aus. Der Preis: eine
Sitzung lässt sich nicht serverseitig widerrufen, sie läuft nach 90 Tagen ab.
Wer alle Sitzungen sofort ungültig machen will, ändert `AUTH_SECRET`.

### Datentrennung prüfen

Jede SQL-Abfrage auf einer Datentabelle muss nach `user_id` filtern. Das
prüft ein Skript, damit kein vergessener Filter fremde Daten zeigt:

```bash
node scripts/audit-user-scope.mjs
```

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

## 4. Gewicht automatisch von der Renpho-Waage

Browser können weder Bluetooth zur Waage noch Health-Daten direkt lesen (vor allem in iOS Safari
nicht). Lösung wie bei den Schritten: die Renpho-App synct Gewicht (und Körperfett) automatisch
nach Apple Health, ein iOS-Shortcut liest den Wert aus Health und schickt ihn an LuHabit.

Anders als beim Schritte-Webhook ist das hier **pro Nutzer**: jedes Konto hat sein eigenes
Secret, das gleichzeitig festlegt, auf welches Konto der Wert geschrieben wird.

1. In der Renpho-App: Health-Sync für Gewicht (und optional Körperfett) aktivieren.
2. In LuHabit einloggen, über das Konto-Menü **„Automatischer Sync“** öffnen (`/einstellungen`),
   Secret generieren und die Webhook-URLs kopieren.
3. Shortcuts-App → neuer Shortcut:
   - Aktion **„Gesundheitsprobe abrufen“** → Gewicht, neuester Wert
   - Aktion **„URL-Inhalt abrufen“**:
     - URL: die kopierte Gewicht-URL (`.../api/entries/webhook?habit=weight&secret=...`)
     - Methode: POST
     - Anfragetext (JSON): `{ "value": [Wert aus Schritt 1] }`
   - Optional: dieselben zwei Aktionen für Körperfett, mit der Bodyfat-URL
4. Unter **Automation** einen Trigger **„App“** → Renpho → „wird geschlossen“ anlegen, der den
   Shortcut lautlos ausführt (Nachfrage vor Ausführung: aus) — läuft dann automatisch nach jedem
   Wiegen.

Bis dahin bzw. alternativ einfach manuell auf der `/koerper`-Seite eintragen.

## 5. Deploy auf Vercel

```bash
npx vercel
```

Anschließend im Vercel-Dashboard unter **Settings → Environment Variables** dieselben Variablen wie in `.env.local` eintragen (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_API_TOKEN`, optional `APP_PASSCODE`, `STEPS_WEBHOOK_SECRET`) und neu deployen.
