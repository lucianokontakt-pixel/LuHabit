"use client";

import { CloudOff, RefreshCw, Check, TriangleAlert } from "lucide-react";
import { useSyncStatus } from "@/lib/use-sync-status";
import { cn } from "@/lib/utils";

/**
 * Live-Anzeige des Sync-Zustands. Bleibt unsichtbar, solange nichts zu
 * berichten ist — passend zum sonst leisen Nav. Erscheint nur, wenn:
 *   - kein Netz da ist (bleibt stehen, bis es zurück ist),
 *   - noch etwas auf das Senden wartet,
 *   - gerade eben etwas fertig geworden ist (kurze Bestätigung, blendet aus).
 */
export function SyncStatus() {
  const { online, pending, failed, justSynced } = useSyncStatus();

  if (online && pending === 0 && failed === 0 && !justSynced) return null;

  // Abgelehntes zuerst, auch offline: es geht von allein nicht weg, und
  // "Offline" daneben zu zeigen hieße, den ernsteren der beiden Zustände zu
  // verschweigen.
  const { Icon, label, tone } =
    failed > 0
      ? {
          Icon: TriangleAlert,
          label:
            failed === 1 ? "1 Änderung nicht gespeichert" : `${failed} Änderungen nicht gespeichert`,
          tone: "alert" as const,
        }
      : !online
        ? { Icon: CloudOff, label: "Offline", tone: "muted" as const }
        : pending > 0
          ? {
              Icon: RefreshCw,
              label: pending === 1 ? "Wird gesendet" : `${pending} werden gesendet`,
              tone: "active" as const,
            }
          : { Icon: Check, label: "Synchronisiert", tone: "done" as const };

  return (
    <span
      className={cn(
        "flex animate-in items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-medium fade-in-0",
        // Die drei harmlosen Zustände bleiben grau — sie berichten nur. Der
        // vierte nicht: er verlangt eine Entscheidung, und grau würde ihn
        // neben "Synchronisiert" stellen, wo er nicht hingehört.
        tone === "alert"
          ? "bg-destructive/10 text-destructive"
          : "bg-elevated text-muted-foreground"
      )}
    >
      <Icon className={cn("size-3", tone === "active" && "animate-spin")} />
      {/* Immer sichtbar, nicht erst ab sm: — auf dem Handy gibt es keinen
          Hover-Tooltip, der ein bloßes Icon erklären könnte, und genau da
          soll der Zustand ja "live" ablesbar sein. */}
      <span>{label}</span>
    </span>
  );
}
