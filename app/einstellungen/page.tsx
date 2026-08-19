"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function webhookUrl(habit: string, secret: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/entries/webhook?habit=${habit}&secret=${secret}`;
}

function copy(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success("In die Zwischenablage kopiert"))
    .catch(() => toast.error("Kopieren fehlgeschlagen"));
}

export default function EinstellungenPage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/webhook-secret")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { secret: string | null } | null) => {
        if (active) setSecret(data?.secret ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function generate() {
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

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-sm text-muted-foreground">Automatischer Sync</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
          Einstellungen
        </h1>
      </div>

      <Card className="gap-4">
        <div className="px-(--card-spacing)">
          <h2 className="text-sm font-medium">Webhook-Secret</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Identifiziert dein Konto gegenüber externen Automationen (z. B. einem iOS-Shortcut).
            Nicht weitergeben — wer das Secret kennt, kann Werte auf dein Konto schreiben.
          </p>
        </div>

        <div className="px-(--card-spacing)">
          {loading ? (
            <p className="text-sm text-muted-foreground">Lädt …</p>
          ) : secret ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-elevated px-3 py-1.5 text-xs break-all">
                {secret}
              </code>
              <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
                <RefreshCw className="size-3.5" />
                Neu generieren
              </Button>
            </div>
          ) : (
            <Button onClick={generate} disabled={generating}>
              Secret generieren
            </Button>
          )}
          {secret && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              Neu generieren macht alte Shortcuts ungültig — die müssten dann mit dem neuen
              Secret aktualisiert werden.
            </p>
          )}
        </div>
      </Card>

      {secret && (
        <Card className="gap-4">
          <div className="px-(--card-spacing)">
            <h2 className="text-sm font-medium">Webhook-URLs</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Für den iOS-Shortcut: POST mit JSON-Body <code>{`{ "value": 82.4 }`}</code>.
            </p>
          </div>
          <div className="flex flex-col gap-2 px-(--card-spacing)">
            {[
              { habit: "weight", label: "Gewicht" },
              { habit: "bodyfat", label: "Körperfett" },
            ].map(({ habit, label }) => {
              const url = webhookUrl(habit, secret);
              return (
                <div key={habit} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 rounded-lg bg-elevated px-3 py-1.5">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="truncate text-xs">{url}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`${label}-URL kopieren`}
                    onClick={() => copy(url)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
