"use client";

import { CloudOff, RefreshCw, Check } from "lucide-react";
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
  const { online, pending, justSynced } = useSyncStatus();

  if (online && pending === 0 && !justSynced) return null;

  const { Icon, label, tone } = !online
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
        "flex animate-in items-center gap-1.5 rounded-pill bg-elevated px-2.5 py-1 text-[11px] font-medium text-muted-foreground fade-in-0"
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
