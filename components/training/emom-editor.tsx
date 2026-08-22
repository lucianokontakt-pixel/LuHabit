"use client";

import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pause as PauseIcon, Plus, Trash2 } from "lucide-react";
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
import { createEmomTemplate, updateEmomTemplate } from "@/lib/api-emom";
import {
  DEFAULT_TEMPLATE,
  MAX_PREPARE_SECONDS,
  MAX_REST_SECONDS,
  MAX_ROUNDS,
  MAX_STEP_REPS,
  MAX_STEP_SECONDS,
  MIN_STEP_SECONDS,
  formatSeconds,
  totalDuration,
  type EmomStep,
  type EmomTemplate,
} from "@/lib/emom";
import { cn } from "@/lib/utils";

const MAX_STEPS = 12;
const DEFAULT_REST_SECONDS = 20;

/** Häufige Intervalle als Ein-Tipp-Vorgabe für den ersten Schritt. */
const PRESETS = [30, 45, 60, 90, 120];

/**
 * Ein An/Aus-Schalter mit Zahlenfeld dahinter — für Vorbereitung und Pause
 * zwischen Runden. Der eingetippte Wert bleibt beim Ausschalten erhalten,
 * damit ein versehentliches Aus/Ein nicht die Zahl mit ihm verschluckt.
 */
function ToggleSeconds({
  label,
  hint,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  min,
  max,
  step,
  idPrefix,
}: {
  label: string;
  hint: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: number | null;
  onValueChange: (value: number | null) => void;
  min: number;
  max: number;
  step: number;
  idPrefix: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-panel bg-elevated p-2.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <Label className="min-w-0 truncate text-xs text-muted-foreground">{label}</Label>
        <div className="flex shrink-0 gap-1">
          {([false, true] as const).map((option) => (
            <button
              key={String(option)}
              type="button"
              onClick={() => onEnabledChange(option)}
              aria-pressed={enabled === option}
              className={cn(
                "rounded-pill px-3 py-1 text-xs transition-colors",
                enabled === option
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {option ? "Ein" : "Aus"}
            </button>
          ))}
        </div>
      </div>
      {enabled ? (
        <NumberField
          id={`${idPrefix}-seconds`}
          label="Sekunden"
          value={value}
          onChange={onValueChange}
          min={min}
          max={max}
          step={step}
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function EmomEditor({
  open,
  template,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** null = neue Vorlage anlegen. */
  template: EmomTemplate | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (templates: EmomTemplate[]) => void;
}) {
  const [name, setName] = useState(DEFAULT_TEMPLATE.name);
  const [prepareEnabled, setPrepareEnabled] = useState(true);
  const [prepareSeconds, setPrepareSeconds] = useState<number | null>(
    DEFAULT_TEMPLATE.prepareSeconds
  );
  const [restEnabled, setRestEnabled] = useState(false);
  const [restSeconds, setRestSeconds] = useState<number | null>(DEFAULT_REST_SECONDS);
  const [rounds, setRounds] = useState<number | null>(DEFAULT_TEMPLATE.rounds);
  const [steps, setSteps] = useState<EmomStep[]>(DEFAULT_TEMPLATE.steps);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- füllt das Formular einmalig beim Öffnen
    setName(template?.name ?? DEFAULT_TEMPLATE.name);
    const prepare = template?.prepareSeconds ?? DEFAULT_TEMPLATE.prepareSeconds;
    setPrepareEnabled(prepare > 0);
    setPrepareSeconds(prepare > 0 ? prepare : DEFAULT_TEMPLATE.prepareSeconds);
    const rest = template?.restSeconds ?? 0;
    setRestEnabled(rest > 0);
    setRestSeconds(rest > 0 ? rest : DEFAULT_REST_SECONDS);
    setRounds(template?.rounds ?? DEFAULT_TEMPLATE.rounds);
    setSteps(
      template && template.steps.length > 0
        ? template.steps.map((s) => ({ ...s }))
        : DEFAULT_TEMPLATE.steps.map((s) => ({ ...s }))
    );
    setError(null);
  }, [open, template]);

  function patchStep(index: number, patch: Partial<EmomStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) =>
      prev.length >= MAX_STEPS
        ? prev
        : [
            ...prev,
            { seconds: prev[prev.length - 1]?.seconds ?? 60, reps: null, label: "" },
          ]
    );
  }

  function removeStep(index: number) {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Die Vorlage braucht einen Namen.");
      return;
    }

    const cleanSteps = steps
      .map((s) => ({
        seconds: Math.round(s.seconds),
        reps: s.reps && s.reps > 0 ? Math.round(s.reps) : null,
        label: s.label.trim(),
      }))
      .filter((s) => s.seconds >= MIN_STEP_SECONDS);

    if (cleanSteps.length === 0) {
      setError(`Mindestens ein Schritt mit ${MIN_STEP_SECONDS} Sekunden oder mehr.`);
      return;
    }

    // Ein "Ein"-Schalter mit leerem Feld darf nicht still als 0 (= "Aus")
    // gespeichert werden — der Schalter würde etwas anderes behaupten, als
    // tatsächlich gilt.
    if (prepareEnabled && !(prepareSeconds && prepareSeconds > 0)) {
      setError("Die Vorbereitung braucht eine Sekundenzahl — oder schalte sie aus.");
      return;
    }
    if (restEnabled && !(restSeconds && restSeconds > 0)) {
      setError("Die Pause zwischen Übungen braucht eine Sekundenzahl — oder entfern sie.");
      return;
    }

    const payload = {
      name: trimmed,
      prepareSeconds: prepareEnabled ? prepareSeconds! : 0,
      rounds: rounds ?? 1,
      steps: cleanSteps,
      restSeconds: restEnabled ? restSeconds! : 0,
    };

    setSaving(true);
    setError(null);
    try {
      const templates = template
        ? await updateEmomTemplate({ ...payload, id: template.id })
        : await createEmomTemplate(payload);
      onSaved(templates);
      toast.success(template ? `„${trimmed}" gespeichert` : `„${trimmed}" angelegt`);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte Vorlage nicht speichern");
    } finally {
      setSaving(false);
    }
  }

  const preview = totalDuration({
    id: "preview",
    position: 0,
    name,
    prepareSeconds: prepareEnabled ? (prepareSeconds ?? 0) : 0,
    rounds: rounds ?? 1,
    steps: steps.filter((s) => s.seconds >= MIN_STEP_SECONDS),
    restSeconds: restEnabled ? (restSeconds ?? 0) : 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto rounded-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Vorlage bearbeiten" : "Neue Vorlage"}</DialogTitle>
          <DialogDescription>
            Jeder Schritt ist eine Runde. Mehrere Schritte kommen reihum dran — so entstehen
            wechselnde Intervalle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emom-name" className="text-xs text-muted-foreground">
              Name
            </Label>
            <Input
              id="emom-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Burpee-Finisher"
            />
          </div>

          <NumberField
            id="emom-rounds"
            label="Runden"
            value={rounds}
            onChange={setRounds}
            min={1}
            max={MAX_ROUNDS}
          />

          <ToggleSeconds
            idPrefix="emom-prepare"
            label="Vorbereitung"
            hint="Kein Countdown — es geht sofort mit Runde 1 los."
            enabled={prepareEnabled}
            onEnabledChange={setPrepareEnabled}
            value={prepareSeconds}
            onValueChange={setPrepareSeconds}
            min={5}
            max={MAX_PREPARE_SECONDS}
            step={5}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Schritte {steps.length > 1 && `(${steps.length} pro Runde)`}
              </Label>
              {steps.length < MAX_STEPS && (
                <Button variant="ghost" size="sm" onClick={addStep}>
                  <Plus />
                  Schritt
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Die Dauer ist die Arbeitszeit der Übung selbst. Eine Pause fügst du direkt unten
              zwischen den Übungen ein — dort, nicht hier.
            </p>

            <div className="flex flex-col gap-1.5">
              {steps.map((step, index) => {
                // Nach diesem Schritt folgt eine Pause: entweder vor dem
                // nächsten Schritt derselben Runde, oder — beim letzten
                // Schritt — vor der Wiederholung der ganzen Runde. Nur beim
                // allerletzten Schritt der einmaligen (rounds = 1) Vorlage
                // gibt es danach nichts mehr, worauf sich die Pause bezöge.
                const isLastStep = index === steps.length - 1;
                const hasGapAfter = !(isLastStep && (rounds ?? 1) <= 1);

                return (
                  <Fragment key={index}>
                    <div className="flex flex-col gap-2.5 rounded-panel bg-elevated p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">
                          Schritt {index + 1}
                          {steps.length > 1 && ` von ${steps.length}`}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <label className="flex items-center gap-1 rounded-field border border-input bg-elevated px-2 py-1.5">
                            <span className="sr-only">
                              Dauer dieser Übung in Sekunden
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              value={step.seconds}
                              onChange={(e) => {
                                const parsed = Number(e.target.value);
                                patchStep(index, {
                                  seconds: Number.isFinite(parsed) ? parsed : 0,
                                });
                              }}
                              min={MIN_STEP_SECONDS}
                              max={MAX_STEP_SECONDS}
                              step={5}
                              className="nums w-10 bg-transparent text-right text-sm text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="text-xs text-muted-foreground">s</span>
                          </label>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeStep(index)}
                            disabled={steps.length <= 1}
                            aria-label={`Schritt ${index + 1} entfernen`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <Label
                            htmlFor={`emom-step-${index}-label`}
                            className="truncate text-[11px] text-muted-foreground"
                          >
                            Übung (optional)
                          </Label>
                          <Input
                            id={`emom-step-${index}-label`}
                            value={step.label}
                            onChange={(e) => patchStep(index, { label: e.target.value })}
                            placeholder="z. B. Burpees"
                            className="h-10 px-3 text-sm"
                          />
                        </div>
                        <NumberField
                          id={`emom-step-${index}-reps`}
                          label="Wdh."
                          value={step.reps}
                          onChange={(value) => patchStep(index, { reps: value })}
                          min={1}
                          max={MAX_STEP_REPS}
                          placeholder="12"
                          className="w-20 shrink-0"
                        />
                      </div>
                    </div>

                    {hasGapAfter &&
                      (restEnabled ? (
                        <div className="flex flex-wrap items-center gap-2.5 rounded-panel bg-card px-3 py-2">
                          <PauseIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="shrink-0 text-xs font-medium text-foreground">
                            Pause
                          </span>
                          <NumberField
                            id={`emom-rest-${index}`}
                            label="Sekunden"
                            value={restSeconds}
                            onChange={setRestSeconds}
                            min={5}
                            max={MAX_REST_SECONDS}
                            step={5}
                            className="w-24 shrink-0"
                          />
                          {isLastStep && (
                            <span className="text-[11px] text-muted-foreground">
                              dann von vorn
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setRestEnabled(false)}
                            aria-label="Pause entfernen"
                            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRestEnabled(true)}
                          className="flex items-center justify-center gap-1.5 rounded-panel border border-dashed border-foreground/15 py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                        >
                          <Plus className="size-3.5" />
                          Pause einfügen
                        </button>
                      ))}
                  </Fragment>
                );
              })}
            </div>

            {steps.length === 1 && (
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => patchStep(0, { seconds })}
                    className="rounded-pill bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Gesamtdauer: <span className="nums">{formatSeconds(preview)}</span> min
          </p>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Speichert…" : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
