# Steps

Trainings-App: Pläne, Progression und Verlauf, dazu Gewicht, Körperfett und eine
Körperkarte. 1295 Übungen mit Bewegungs-GIF, offline nutzbar.

Drei Bereiche: **Training** (was mache ich), **Statistik** (wie läuft es),
**Körper** (wo stehe ich).

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Cloudflare D1 (Datenbank) · Cloudflare Workers via OpenNext (Hosting)

## Lokal starten

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Ohne gesetzte `CLOUDFLARE_*`-Variablen startet die App trotzdem (leer), Speichern schlägt aber fehl — die Datenbank muss zuerst eingerichtet werden.

## 1. Cloudflare D1 einrichten

```bash
npx wrangler login
npx wrangler d1 create luhabit
```

Der Befehl gibt dir eine `database_id` aus. Schema anwenden:

```bash
npx wrangler d1 execute luhabit --remote --file=./schema.sql
```

Danach in `.env.local` (und später als GitHub-Actions-Secret bzw. Worker-Variable, siehe Abschnitt 5) eintragen:

- `CLOUDFLARE_ACCOUNT_ID` — im Cloudflare-Dashboard rechts auf der Übersichtsseite
- `CLOUDFLARE_D1_DATABASE_ID` — Ausgabe von `d1 create`, oder `npx wrangler d1 list`
- `CLOUDFLARE_API_TOKEN` — unter **My Profile → API Tokens → Create Token**, Berechtigungen „D1 Edit“ und „Workers Scripts Edit“ für den Account geben (Letzteres nur fürs Deployen nötig)

Die App spricht D1 über Cloudflares HTTP-Query-API an (`lib/d1.ts`), nicht über eine D1-Bindung im Worker — das funktioniert unabhängig davon, wo die App selbst läuft.

## 2. Anmeldung

Steps ist mehrbenutzerfähig: jedes Konto sieht nur seine eigenen Pläne,
Übungen, Einheiten und Körperwerte. Ohne gesetzte `GOOGLE_CLIENT_ID` bleibt die App
offen und alle Zugriffe laufen auf das Owner-Konto — praktisch lokal, in
Produktion muss sie gesetzt sein.

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

Sitzungen liegen als signiertes Cookie (HMAC-SHA256), nicht in der Datenbank —
der Proxy kommt so ohne Datenbankzugriff pro Request aus. Der Preis: eine
Sitzung lässt sich nicht serverseitig widerrufen, sie läuft nach 90 Tagen ab.
Wer alle Sitzungen sofort ungültig machen will, ändert `AUTH_SECRET`.

### Datentrennung prüfen

Jede SQL-Abfrage auf einer Datentabelle muss nach `user_id` filtern. Das
prüft ein Skript, damit kein vergessener Filter fremde Daten zeigt:

```bash
node scripts/audit-user-scope.mjs
```

Dasselbe Skript prüft seit dem Sync-Umbau mit: dass jedes `SELECT` auf einer
weich gelöschten Tabelle `deleted_at` filtert. Ohne diesen Filter tauchen
gelöschte Zeilen wieder auf und kommen beim nächsten Abgleich aufs Handy zurück.

### SQL gegen das Schema prüfen

TypeScript, ESLint und die Tests sehen kein SQL — ein falscher Spaltenname oder
ein `ON CONFLICT`, das zu keinem Schlüssel passt, fällt sonst erst beim
Schreiben in Produktion auf. Dieses Skript spielt Schema und Migrationen in eine
Wegwerf-Datenbank und lässt jedes Statement der API mit `EXPLAIN` vorbereiten:

```bash
node scripts/audit-sql.mjs
```

## 3. Gewicht automatisch von der Renpho-Waage

Browser können weder Bluetooth zur Waage noch Health-Daten direkt lesen (vor allem in iOS Safari
nicht). Lösung: die Renpho-App synct Gewicht (und Körperfett) automatisch nach Apple Health, ein
iOS-Shortcut liest den Wert aus Health und schickt ihn an Steps.

Der Webhook gilt **pro Nutzer**: jedes Konto hat sein eigenes Secret, das
gleichzeitig festlegt, auf welches Konto der Wert geschrieben wird.

1. In der Renpho-App: Health-Sync für Gewicht (und optional Körperfett) aktivieren.
2. In Steps einloggen, über das Konto-Menü **„Einstellungen“** öffnen (`/einstellungen`),
   unter „Automatischer Sync“ ein Secret generieren und die Webhook-URLs kopieren.
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

Bis dahin bzw. alternativ einfach manuell unter `/statistik/koerper` eintragen.

## 4. Deploy auf Cloudflare Workers

Die App läuft selbst als Cloudflare Worker (via [OpenNext](https://opennext.js.org/cloudflare)),
nicht nur die Datenbank. Konfiguration liegt in `wrangler.jsonc`.

### Automatisch (empfohlen)

`.github/workflows/deploy.yml` deployt bei jedem Push auf `main` automatisch
(`npm run cf:deploy`, also `opennextjs-cloudflare build && opennextjs-cloudflare deploy`).
Einmalig einrichten:

1. Cloudflare-Dashboard → **My Profile → API Tokens → Create Token** → Vorlage
   „Edit Cloudflare Workers“ (oder ein bestehender Token mit zusätzlich
   „Workers Scripts: Edit“, siehe Abschnitt 1).
2. GitHub-Repo → **Settings → Secrets and variables → Actions → New repository
   secret** → Name `CLOUDFLARE_API_TOKEN`, Wert der Token aus Schritt 1.

Der Workflow lässt sich zusätzlich manuell auslösen (**Actions → Deploy → Run workflow**),
z. B. für einen anderen Branch als `main`.

### Manuell

```bash
npm run cf:deploy
```

Braucht lokal dieselben `CLOUDFLARE_*`-Variablen wie oben (aus `.env.local` oder der Shell-Umgebung).

### Laufzeit-Variablen des Workers

`APP_URL`, `OWNER_EMAIL` und `GOOGLE_CLIENT_ID` stehen als `vars` direkt in
`wrangler.jsonc` (unkritisch, sichtbar im Client). Alles andere — `AUTH_SECRET`,
`GOOGLE_CLIENT_SECRET`, `CLOUDFLARE_*`, `STEPS_WEBHOOK_SECRET` —
sind Worker-Secrets, einmalig gesetzt mit:

```bash
npx wrangler secret put AUTH_SECRET
```

(entsprechend für die anderen). Die bleiben über Redeploys hinweg erhalten,
müssen also nicht bei jedem Deploy neu gesetzt werden.

## 5. Als App installieren

Steps hat ein Web-App-Manifest (`app/manifest.ts`) und ist damit installierbar:

- **iOS Safari:** Teilen-Icon → „Zum Home-Bildschirm“
- **Android Chrome:** Menü → „App installieren“ (oder ein automatischer Install-Banner)

Läuft danach im eigenen Fenster ohne Browser-Adressleiste. Kein Apple-Developer-Konto,
kein Zertifikat, kein Ablaufdatum — das betrifft nur nativ signierte Apps.

### Offline im Gym

Die App ist local-first: alle Lesewege gehen an IndexedDB (`lib/local-db.ts`),
nie ans Netz. Ein einziger Endpunkt `/api/sync` gleicht mit dem Server ab
(`lib/sync.ts`). Schreibvorgänge landen zuerst lokal und dann in einer
Warteschlange (`lib/write-queue.ts`, `lib/write-ops.ts`); sie gehen raus, sobald
Netz da ist. Jede Operation beschreibt einen Zustand, keinen Zuwachs — ein
zweiter Versuch ist deshalb folgenlos.

Einheit starten, protokollieren und abschließen geht damit vollständig ohne
Empfang. Der Zwischenstand einer laufenden Einheit liegt zusätzlich als Entwurf
im localStorage und überlebt sogar einen Neustart mitten im Training.

`public/sw.js` cacht die Seitenhüllen (Liste `WARMUP`) und die Build-Dateien;
angemeldet wird er von `components/service-worker.tsx` — nur im fertigen Build,
im `npm run dev` also bewusst nicht.

**Die Übungsbilder sind die Ausnahme.** Alle 1295 GIFs liegen zwar lokal unter
`public/uebungen/` (rund 120 MB), aber auf dem *Server*. Auf dem Gerät landen
nur die, die man angesehen hat — oder die, die der Knopf „Übungsbilder aufs
Gerät laden" in den Einstellungen für den aktiven Plan vorlädt. Alles
vorzuladen würde auf iOS an der Speicherquote scheitern.

Ändert sich die Cache-Strategie, muss `VERSION` in `public/sw.js` hochgezählt
werden — sonst behalten installierte Geräte die alten Regeln.
