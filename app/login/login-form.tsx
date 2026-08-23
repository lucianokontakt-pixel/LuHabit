"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";

const ERRORS: Record<string, string> = {
  nicht_konfiguriert: "Google-Login ist auf dem Server noch nicht eingerichtet.",
  abgebrochen: "Die Anmeldung bei Google wurde abgebrochen.",
  unvollstaendig: "Google hat keine vollständige Antwort geschickt. Bitte nochmal versuchen.",
  abgelaufen: "Der Anmeldeversuch ist abgelaufen. Bitte nochmal starten.",
  state_falsch: "Die Anmeldung konnte nicht zugeordnet werden. Bitte nochmal starten.",
  token_fehlgeschlagen: "Google hat den Anmelde-Code nicht akzeptiert.",
  kein_id_token: "Google hat keine Identität mitgeschickt.",
  token_ungueltig: "Die Antwort von Google war ungültig.",
  keine_mail: "Für dieses Google-Konto ist keine bestätigte Mailadresse hinterlegt.",
  nicht_freigegeben: "Diese Mailadresse ist für LuHabit nicht freigegeben.",
};

/** Googles eigene Fehlercodes in Klartext — spart beim Einrichten viel Raten. */
const DETAIL_HINTS: Record<string, string> = {
  invalid_client: "Client-ID oder Client-Schlüssel stimmen nicht.",
  redirect_uri_mismatch:
    "Diese Weiterleitungs-URI ist bei Google nicht eingetragen.",
  invalid_grant: "Der Anmelde-Code war abgelaufen oder schon benutzt.",
  unauthorized_client: "Der Client darf diesen Anmeldeweg nicht benutzen.",
};

/** Googles Wortmarke — das offizielle „G" in seinen vier Farben. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const oauthError = searchParams.get("error");
  const errorDetail = searchParams.get("detail");
  const silentDone = searchParams.get("silentDone") === "1";

  // Ein abgelaufenes eigenes Sitzungscookie heißt nicht, dass auch die
  // Google-Sitzung weg ist — iOS räumt bei einer als App installierten Seite
  // schon nach rund einer Woche ohne Nutzung das eigene Ablagefach leer, viel
  // öfter, als das 90-Tage-Cookie es vorsähe. Ein stiller Versuch im
  // Hintergrund holt in diesem Fall die Anmeldung ohne sichtbaren
  // Zwischenschritt nach; nur wenn der (einmalig, erkennbar an silentDone)
  // schon gescheitert ist oder ein echter Fehler vorliegt, erscheint der
  // normale Knopf. Ein ausdrückliches Abmelden markiert silentDone selbst,
  // damit es hier nicht sofort wieder rückgängig gemacht wird.
  const autoRetrying = googleEnabled && !oauthError && !silentDone;

  useEffect(() => {
    if (!autoRetrying) return;
    // Eine echte Navigation wie beim Knopf unten, kein Routenwechsel — Ziel
    // ist eine Route, die selbst weiterleitet (zu Google, dann zurück).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/auth/google/start?silent=1&from=${encodeURIComponent(from)}`;
  }, [autoRetrying, from]);

  return (
    <Card className="w-full max-w-sm gap-6">
      <div className="px-(--card-spacing)">
        <h1 className="font-display text-4xl leading-tight tracking-tight">LuHabit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Melde dich an, um deine Habits und dein Training zu sehen.
        </p>
      </div>

      {oauthError && (
        <div className="mx-(--card-spacing) rounded-field bg-elevated px-3 py-2">
          <p className="text-sm text-destructive">
            {ERRORS[oauthError] ?? "Die Anmeldung ist fehlgeschlagen."}
          </p>
          {errorDetail && (
            <p className="mt-1 text-xs text-muted-foreground">
              Meldung von Google: <span className="font-mono">{errorDetail}</span>
              {DETAIL_HINTS[errorDetail] ? ` — ${DETAIL_HINTS[errorDetail]}` : ""}
            </p>
          )}
        </div>
      )}

      {googleEnabled ? (
        autoRetrying ? (
          <div className="px-(--card-spacing) text-sm text-muted-foreground">Meldet an …</div>
        ) : (
          <div className="px-(--card-spacing)">
            {/* Bewusst ein Link, kein fetch: der OAuth-Start ist eine echte
                Navigation zu Google und darf nicht im Hintergrund passieren. */}
            <a
              href={`/api/auth/google/start?from=${encodeURIComponent(from)}`}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-pill bg-elevated text-sm font-medium ring-1 ring-foreground/12 transition-colors hover:ring-foreground/30"
            >
              <GoogleMark />
              Mit Google anmelden
            </a>
          </div>
        )
      ) : (
        <p className="px-(--card-spacing) text-sm text-muted-foreground">
          Es ist keine Anmeldung eingerichtet — die App ist offen zugänglich.
        </p>
      )}
    </Card>
  );
}
