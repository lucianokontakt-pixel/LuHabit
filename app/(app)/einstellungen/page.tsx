"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Copy,
  Download,
  ImageDown,
  KeyRound,
  Languages,
  Laptop,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Sun,
  Trash2,
  User,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { Section } from "@/components/ui/section";
import { FailedWrites } from "@/components/failed-writes";
import { Row } from "@/components/ui/row";
import { Segmented } from "@/components/ui/segmented";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTraining } from "@/lib/training-store";
import { useUebungssprache } from "@/lib/uebungssprache";
import { raeumeAbmeldungAuf } from "@/lib/abmelden";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { registerPasskey } from "@/lib/passkey-client";
import { formatDateLong } from "@/lib/format";
import { ladeMedienVor, type VorladeFortschritt } from "@/lib/medien-vorladen";
import { PageTitle } from "@/components/ui/page-title";

type Me = { email: string; name: string | null; picture: string | null };
type Passkey = { id: string; name: string; created_at: string; last_used_at: string | null };

function webhookUrl(metric: string, secret: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/entries/webhook?habit=${metric}&secret=${secret}`;
}

function copy(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success("In die Zwischenablage kopiert"))
    .catch(() => toast.error("Kopieren fehlgeschlagen"));
}

const SPRACH_OPTIONS = [
  { value: "de", label: "Deutsch", icon: Languages },
  { value: "en", label: "English", icon: Languages },
] as const;

const THEME_OPTIONS = [
  { value: "light", label: "Hell", icon: Sun },
  { value: "dark", label: "Dunkel", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

/**
 * Die drei Zurücksetzen-Wege. Die Einrichtung steht bewusst getrennt von den
 * Daten: sie lässt sich ohne Verlust wiederherstellen, ein gelöschter Verlauf
 * nicht.
 */
const RESETS = [
  {
    scope: "setup",
    label: "Einrichtung zurücksetzen",
    hint: "Übungsbibliothek und Push/Pull/Legs wie bei einem frischen Konto. Körperwerte und Einheiten bleiben.",
    title: "Einrichtung auf Werkszustand zurücksetzen?",
    description:
      "Deine Übungen, Trainingspläne und dein Körperprofil gehen auf den Ausgangszustand zurück. Eigene Pläne und Übungen verschwinden dabei — außer eigenen Übungen, zu denen es protokollierte Sätze gibt, sonst stünden in alten Einheiten nur noch nackte IDs. Körperwerte und Trainingseinheiten bleiben vollständig erhalten.",
    confirm: "Zurücksetzen",
    success: "Einrichtung zurückgesetzt",
  },
  {
    scope: "body-values",
    label: "Alle Körperwerte löschen",
    hint: "Jede Messung von Gewicht und Körperfett.",
    title: "Alle Körperwerte löschen?",
    description:
      "Gewichts- und Körperfettverlauf sind danach leer, der BMI rechnet mit nichts mehr, und die Gewichtsvorschläge für Eigengewichtsübungen fallen auf null. Deine Einstellungen und Trainingseinheiten bleiben. Das lässt sich nicht rückgängig machen; exportiere vorher, wenn du sie behalten willst.",
    confirm: "Körperwerte löschen",
    success: "Alle Körperwerte gelöscht",
  },
  {
    scope: "training-sessions",
    label: "Alle Trainingseinheiten löschen",
    hint: "Der gesamte Trainingsverlauf mit allen protokollierten Sätzen.",
    title: "Alle Trainingseinheiten löschen?",
    description:
      "Jede protokollierte Einheit samt Sätzen wird gelöscht. Progression, Statistik und Bestleistungen fangen danach bei null an, und die Gewichtsvorschläge im Training auch. Deine Pläne und Übungen bleiben. Das lässt sich nicht rückgängig machen.",
    confirm: "Einheiten löschen",
    success: "Alle Trainingseinheiten gelöscht",
  },
] as const;

type ResetScope = (typeof RESETS)[number]["scope"];

export default function EinstellungenPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [addingPasskey, setAddingPasskey] = useState(false);
  const { theme, setTheme } = useTheme();
  const [uebungssprache, setUebungssprache] = useUebungssprache();
  const [mounted, setMounted] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [secretLoading, setSecretLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pendingReset, setPendingReset] = useState<ResetScope | null>(null);
  const [resetting, setResetting] = useState(false);
  const [preload, setPreload] = useState<VorladeFortschritt | null>(null);
  const logoutForm = useRef<HTMLFormElement>(null);

  const { activePlan, exerciseById } = useTraining();

  /** Die Übungen des aktiven Plans, jede nur einmal. */
  const planExercises = useMemo(() => {
    if (!activePlan) return [];
    const ids = new Set(
      activePlan.days.flatMap((day) => day.exercises.map((pe) => pe.exerciseId))
    );
    return [...ids].map((id) => exerciseById[id]).filter((e) => e !== undefined);
  }, [activePlan, exerciseById]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standardmuster für next-themes Hydration-Fix
    setMounted(true);
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user: Me | null } | null) => {
        if (data?.user) setMe(data.user);
      })
      .catch(() => {});
    fetch("/api/webhook-secret")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { secret: string | null } | null) => setSecret(data?.secret ?? null))
      .catch(() => {})
      .finally(() => setSecretLoading(false));
    setPasskeySupported(browserSupportsWebAuthn());
    loadPasskeys();
  }, []);

  function loadPasskeys() {
    fetch("/api/passkeys")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { passkeys: Passkey[] } | null) => setPasskeys(data?.passkeys ?? []))
      .catch(() => setPasskeys([]));
  }

  async function addPasskey() {
    setAddingPasskey(true);
    const result = await registerPasskey();
    setAddingPasskey(false);
    if (result.ok) {
      toast.success(`„${result.name}“ hinzugefügt`);
      loadPasskeys();
    } else {
      toast.error(result.error);
    }
  }

  async function removePasskey(passkey: Passkey) {
    setPasskeys((prev) => (prev ? prev.filter((p) => p.id !== passkey.id) : prev));
    try {
      const res = await fetch(`/api/passkeys/${passkey.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`„${passkey.name}“ entfernt`);
    } catch {
      toast.error("Konnte den Passkey nicht entfernen");
      loadPasskeys();
    }
  }

  async function generateSecret() {
    setGenerating(true);
    try {
      const res = await fetch("/api/webhook-secret", { method: "POST" });
      if (!res.ok) throw new Error();
      const data: { secret: string } = await res.json();
      setSecret(data.secret);
      toast.success("Neues Secret erzeugt");
    } catch {
      toast.error("Konnte Secret nicht erzeugen");
    } finally {
      setGenerating(false);
    }
  }

  async function runPreload() {
    setPreload({ fertig: 0, gesamt: planExercises.length * 2 + 1 });
    const { geladen, fehler } = await ladeMedienVor(planExercises, setPreload);
    setPreload(null);
    if (fehler > 0) toast.error(`${geladen} Dateien geladen, ${fehler} nicht erreichbar`);
    else toast.success(`${geladen} Dateien liegen jetzt auf dem Gerät`);
  }

  async function runReset(scope: ResetScope) {
    const config = RESETS.find((r) => r.scope === scope)!;
    setResetting(true);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      if (!res.ok) throw new Error();
      toast.success(config.success);
      // Vieles hängt an geladenen Client-Zuständen — ein voller Reload ist
      // hier ehrlicher als ein halb aktualisierter Baum.
      window.location.reload();
    } catch {
      toast.error("Zurücksetzen fehlgeschlagen");
      setResetting(false);
    }
  }

  /**
   * Abmelden über ein echtes Formular, nicht per fetch: die Route antwortet mit
   * einer Weiterleitung und einem gelöschten Cookie, und ein voller Seitenwechsel
   * ist hier genau richtig — danach darf kein Client-Zustand des alten Kontos
   * mehr im Speicher liegen.
   */
  async function logout() {
    await raeumeAbmeldungAuf();
    logoutForm.current?.submit();
  }

  const pending = RESETS.find((r) => r.scope === pendingReset);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle eyebrow="Konto, Darstellung & Daten">Einstellungen</PageTitle>

      {/* Ganz oben, noch vor dem Konto: das ist das Einzige auf dieser Seite,
          das nicht warten kann. Der Abschnitt zeigt sich nur, wenn es etwas zu
          entscheiden gibt. */}
      <FailedWrites />

      <Section title="Konto">
        <Row
          icon={User}
          iconTint="var(--chart-2)"
          title={me?.name ?? me?.email ?? "Nicht angemeldet"}
          subtitle={me?.name ? me.email : undefined}
        />
        {me && (
          <>
            <form ref={logoutForm} action="/api/auth/logout" method="post" className="hidden" />
            <Row
              icon={LogOut}
              iconTint="var(--destructive)"
              title="Abmelden"
              danger
              onClick={logout}
            />
          </>
        )}
      </Section>

      {/* Ohne Sitzung gibt es kein Konto, an das sich ein Passkey hängen
          ließe — und ohne WebAuthn-Unterstützung liefe der Knopf ins Leere. */}
      {me && passkeySupported && (
        <Section
          title="Passkeys"
          footer="Face ID oder Touch ID statt Google — schneller, und du bleibst angemeldet, auch wenn iOS die Google-Sitzung mal vergisst."
        >
          {passkeys === null ? (
            <Row icon={KeyRound} title="Lädt …" />
          ) : passkeys.length === 0 ? (
            <Row icon={KeyRound} title="Noch kein Passkey eingerichtet" />
          ) : (
            passkeys.map((passkey) => (
              <Row
                key={passkey.id}
                icon={KeyRound}
                iconTint="var(--chart-4)"
                title={passkey.name}
                subtitle={
                  passkey.last_used_at
                    ? `Zuletzt genutzt am ${formatDateLong(passkey.last_used_at.slice(0, 10))}`
                    : `Eingerichtet am ${formatDateLong(passkey.created_at.slice(0, 10))}`
                }
              >
                <button
                  type="button"
                  onClick={() => removePasskey(passkey)}
                  aria-label={`„${passkey.name}“ entfernen`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </Row>
            ))
          )}
          <Row
            icon={Plus}
            title={addingPasskey ? "Wird eingerichtet …" : "Passkey hinzufügen"}
            onClick={addPasskey}
            disabled={addingPasskey}
          />
        </Section>
      )}

      {/* Drei Wahlmöglichkeiten mit Icon passen auf 375 px nicht neben eine
          Beschriftung — also über die ganze Breite statt in eine Zeile. */}
      <Section title="Darstellung">
        <div className="px-(--card-spacing) py-3">
          <Segmented
            options={THEME_OPTIONS}
            value={mounted ? ((theme ?? "system") as (typeof THEME_OPTIONS)[number]["value"]) : null}
            onChange={setTheme}
          />
        </div>
      </Section>

      <Section
        title="Übungsnamen"
        footer="Jede Übung der Bibliothek hat beide Namen. Anleitung, Beschreibung und Tipps wechseln mit."
      >
        <div className="px-(--card-spacing) py-3">
          <Segmented
            options={SPRACH_OPTIONS}
            value={mounted ? uebungssprache : null}
            onChange={(wert) => setUebungssprache(wert as "de" | "en")}
          />
        </div>
      </Section>

      <Section
        title="Beim Training"
        footer={
          planExercises.length > 0
            ? `Die Bewegungen deines Plans (${planExercises.length} Übungen) einmal aufs Gerät holen — danach sind sie auch ohne Netz da. Die ganze Bibliothek wären 120 MB und passt nicht.`
            : "Ohne aktiven Plan gibt es nichts vorzuladen."
        }
      >
        <Row
          icon={ImageDown}
          iconTint="var(--chart-3)"
          title="Übungsbilder aufs Gerät laden"
          subtitle={
            preload
              ? `${preload.fertig} von ${preload.gesamt} …`
              : "Bewegungen und Anleitungen für den aktiven Plan."
          }
          onClick={preload ? undefined : runPreload}
          disabled={planExercises.length === 0 || preload !== null}
          accessory={preload ? "none" : "chevron"}
        />
      </Section>

      <Section
        title="Automatischer Sync"
        footer="Für Automationen — etwa einen iOS-Shortcut, der dein Gewicht aus Apple Health schickt. Nicht weitergeben: wer das Secret kennt, kann Werte auf dein Konto schreiben."
      >
        {secretLoading ? (
          <Row icon={Webhook} title="Lädt …" />
        ) : secret ? (
          <>
            <Row
              icon={Webhook}
              iconTint="var(--chart-5)"
              title="Secret"
              subtitle={<span className="block truncate font-mono">{secret}</span>}
              onClick={() => copy(secret)}
            >
              <Copy className="size-4 shrink-0 text-muted-foreground" />
            </Row>
            {[
              { metric: "weight", label: "Gewicht" },
              { metric: "bodyfat", label: "Körperfett" },
            ].map(({ metric, label }) => (
              <Row
                key={metric}
                title={`${label}-URL kopieren`}
                subtitle={
                  <span className="block truncate">{webhookUrl(metric, secret)}</span>
                }
                onClick={() => copy(webhookUrl(metric, secret))}
              >
                <Copy className="size-4 shrink-0 text-muted-foreground" />
              </Row>
            ))}
            <Row
              icon={RefreshCw}
              title="Neues Secret erzeugen"
              subtitle="Macht alle bisherigen URLs ungültig."
              onClick={generateSecret}
              disabled={generating}
              accessory="chevron"
            />
          </>
        ) : (
          <Row
            icon={Webhook}
            iconTint="var(--chart-5)"
            title="Secret erzeugen"
            onClick={generateSecret}
            disabled={generating}
            accessory="chevron"
          />
        )}
      </Section>

      <Section
        title="Daten"
        footer="Die JSON-Datei enthält den vollständigen Bestand, die CSV-Dateien öffnen sich direkt in einer Tabelle. Das Webhook-Secret bleibt draußen."
      >
        {/* Echte Links statt fetch: der Server schickt die Datei mit
            Content-Disposition, das funktioniert auch in iOS Safari. */}
        <div className="flex flex-wrap gap-2 px-(--card-spacing) py-3">
          <a href="/api/export" download className={buttonVariants({ variant: "default", size: "sm" })}>
            <Download className="size-3.5" />
            Alles als JSON
          </a>
          <a
            href="/api/export?format=koerper"
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="size-3.5" />
            Körperwerte
          </a>
          <a
            href="/api/export?format=training"
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="size-3.5" />
            Training
          </a>
        </div>
      </Section>

      <Section
        title="Zurücksetzen"
        footer="Einrichtung und Daten sind getrennt: der erste Knopf stellt den Auslieferungszustand her, ohne dass ein einziger Wert verloren geht — die beiden anderen löschen wirklich."
      >
        {RESETS.map((reset) => (
          <Row
            key={reset.scope}
            icon={reset.scope === "setup" ? RotateCcw : Trash2}
            iconTint={reset.scope === "setup" ? undefined : "var(--destructive)"}
            title={reset.label}
            subtitle={reset.hint}
            danger={reset.scope !== "setup"}
            disabled={resetting}
            onClick={() => setPendingReset(reset.scope)}
            accessory="chevron"
          />
        ))}
      </Section>

      <Section title="Tipp">
        <Row
          icon={Smartphone}
          iconTint="var(--chart-2)"
          title="Auf den Home-Bildschirm legen"
          subtitle="In Safari über Teilen → Zum Home-Bildschirm. Dann startet die App ohne Adressleiste und funktioniert offline."
        />
      </Section>

      {/* Pflicht laut Lizenz des Datensatzes (data/repdb/LICENSE-DATA.md,
          Punkt 2): ein sichtbarer Hinweis mit Link. Er steht hier, weil das
          die Stelle ist, an der eine App über sich selbst Auskunft gibt. */}
      <Section title="Übungsdaten">
        <p className="px-(--card-spacing) py-3 text-sm text-muted-foreground">
          601 Übungen mit Bildern, Anleitungen und Tipps von{" "}
          <a
            href="https://repdb.co"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            RepDB (repdb.co)
          </a>
          .
        </p>
      </Section>

      <p className="px-1 text-xs text-muted-foreground">
        Steps · Übungsdaten und Körperkarte stammen aus fremden Quellen, siehe NOTICE.md
      </p>

      <AlertDialog
        open={pendingReset !== null}
        onOpenChange={(open) => !open && setPendingReset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const scope = pendingReset;
                setPendingReset(null);
                if (scope) runReset(scope);
              }}
            >
              {pending?.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
