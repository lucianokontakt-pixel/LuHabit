"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/training/number-field";
import { updateEmomResult } from "@/lib/api-emom-results";
import { MAX_ROUNDS, type EmomResult } from "@/lib/emom";

/**
 * Ein protokolliertes Ergebnis nachbessern.
 *
 * Absichtlich schmal: geändert werden nur die Zahl, die Notiz und das Datum.
 * Der Name der Vorlage steht fest — er hält fest, was an dem Tag lief, und
 * wäre nachträglich geändert eine Behauptung über die Vergangenheit. Wie viele
 * Runden geplant waren, gehört aus demselben Grund nicht dazu.
 */
export function EmomResultEditor({
  open,
  result,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  result: EmomResult | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (results: EmomResult[]) => void;
}) {
  const [rounds, setRounds] = useState<number | null>(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !result) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- füllt das Formular einmalig beim Öffnen
    setRounds(result.roundsCompleted);
    setNote(result.note ?? "");
    setDate(result.date);
  }, [open, result]);

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      onSaved(
        await updateEmomResult({
          id: result.id,
          roundsCompleted: rounds ?? 0,
          note: note.trim() || null,
          date: date || result.date,
        })
      );
      toast.success("Ergebnis geändert");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Konnte Ergebnis nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ergebnis bearbeiten</DialogTitle>
          <DialogDescription>
            {result?.templateName} · {result?.roundsPlanned}{" "}
            {result?.roundsPlanned === 1 ? "Runde" : "Runden"} geplant
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <NumberField
              id="emom-result-rounds"
              label="Runden geschafft"
              value={rounds}
              onChange={setRounds}
              min={0}
              // Die geplanten Runden sind die Obergrenze — mehr als eine volle
              // Runde mehr als vorgesehen kann in dieser Vorlage nicht laufen.
              max={result?.roundsPlanned ?? MAX_ROUNDS}
              stepper
              className="w-44 shrink-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label htmlFor="emom-result-date" className="truncate text-[11px] text-muted-foreground">
                Datum
              </Label>
              <Input
                id="emom-result-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 px-3"
              />
            </div>
          </div>

          <Input
            aria-label="Notiz"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notiz (optional)"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Speichert…" : "Speichern"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
