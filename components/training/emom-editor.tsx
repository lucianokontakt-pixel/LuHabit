"use client";

import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
  workDuration,
  type EmomStep,
  type EmomTemplate,
} from "@/lib/emom";
import { cn } from "@/lib/utils";

const MAX_STEPS = 12;
const DEFAULT_REST_SECONDS = 20;

/** Häufige Intervalle als Ein-Tipp-Vorgabe für den ersten Schritt. */
const PRESETS = [30, 45, 60, 90, 120];

/**
 * Ein Schalter mit Zahlenfeld dahinter — für Vorbereitung und Pause zwischen
 * Übungen. Beides in einer Zeile statt das Zahlenfeld darunter aufklappen zu
 * lassen: auf dem Handy kostet jede zusätzliche Zeile Platz, den ein Dialog
 * mit vielen Feldern nicht hat. Der eingetippte Wert bleibt beim Ausschalten
 * erhalten, damit ein versehentliches Aus/Ein nicht die Zahl mit ihm
 * verschluckt.
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
  function adjust(delta: number) {
    const base = value ?? min;
    onChange(Math.max(min, Math.min(max, base + delta)));
  }
  function onChange(next: number) {
    onValueChange(next);
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <label className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
        <span className="truncate text-sm">{label}</span>
        {!enabled && <span className="truncate text-[11px] text-muted-foreground">{hint}</span>}
      </label>
      {enabled && (
        <div className="flex h-10 shrink-0 items-stretch overflow-hidden rounded-pill bg-elevated ring-1 ring-foreground/8">
          <button
            type="button"
            onClick={() => adjust(-step)}
            aria-label={`${label} verringern`}
            className="flex w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:bg-foreground/5"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            id={`${idPrefix}-seconds`}
            aria-label={`${label} in Sekunden`}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={value ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return;
              const parsed = Number(raw);
              if (Number.isFinite(parsed)) onChange(parsed);
            }}
            className="nums w-12 min-w-0 bg-transparent text-center text-base outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => adjust(step)}
            aria-label={`${label} erhöhen`}
            className="flex w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:bg-foreground/5"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      )}
      <Switch checked={enabled} onCheckedChange={onEnabledChange} className="shrink-0" />
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
      setError("Die Pause zwischen Übungen braucht eine Sekundenzahl — oder schalte sie aus.");
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

  const preview = workDuration({
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
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden rounded-card p-0 sm:max-h-[85vh] sm:max-w-lg">
        <DialogHeader className="gap-2 py-4 pl-4 pr-11 sm:gap-3 sm:py-5 sm:pl-5 sm:pr-12">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <DialogTitle>{template ? "Vorlage bearbeiten" : "Neue Vorlage"}</DialogTitle>
              <DialogDescription>Schritte laufen reihum, Runde für Runde.</DialogDescription>
            </div>
            {/* Die Gesamtdauer ist die eine Zahl, die beim Einstellen ständig
                interessiert — verdient deshalb einen festen Platz oben, nicht
                eine Zeile aus Kleingedrucktem ganz unten. pr-12 oben am Header
                hält den Platz frei, den der eingebaute Schließen-Knopf des
                Dialogs (absolut positioniert, oben rechts) sonst überlappen
                würde. */}
            <div className="shrink-0 text-right">
              <p className="nums text-heading-sm leading-none">{formatSeconds(preview)}</p>
              <p className="text-[11px] text-muted-foreground">min gesamt</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 sm:gap-5 sm:px-5 sm:py-5">
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
              stepper
              className="w-28 shrink-0"
            />
          </div>

          {/* Beide Zeiten drumherum in derselben kompakten Zeilenform — eine
              einzige, klar benannte Stelle je Einstellung, statt sie zusätzlich
              bei jedem Übergang zwischen den Schritten noch einmal anzubieten. */}
          <div className="flex flex-col gap-3 rounded-panel bg-elevated/60 px-3 py-2.5">
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
            <span aria-hidden className="h-px bg-border" />
            <ToggleSeconds
              idPrefix="emom-rest"
              label="Pause"
              hint="Zwischen den Übungen — sonst geht's direkt weiter."
              enabled={restEnabled}
              onEnabledChange={setRestEnabled}
              value={restSeconds}
              onValueChange={setRestSeconds}
              min={5}
              max={MAX_REST_SECONDS}
              step={5}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Schritte {steps.length > 1 && `(${steps.length} pro Runde)`}
              </p>
              {steps.length < MAX_STEPS && (
                <Button variant="ghost" size="sm" onClick={addStep}>
                  <Plus />
                  Schritt
                </Button>
              )}
            </div>

            <div className="flex flex-col">
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
                    <div className="flex flex-col gap-2 py-2.5 sm:gap-2.5 sm:py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">
                          Schritt {index + 1}
                          {steps.length > 1 && ` von ${steps.length}`}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeStep(index)}
                          disabled={steps.length <= 1}
                          aria-label={`Schritt ${index + 1} entfernen`}
                          className="-mr-1.5 -mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <Input
                        aria-label="Übung (optional)"
                        value={step.label}
                        onChange={(e) => patchStep(index, { label: e.target.value })}
                        placeholder="Übung (optional), z. B. Burpees"
                      />

                      <div className="flex gap-2.5">
                        <NumberField
                          id={`emom-step-${index}-seconds`}
                          label="Dauer"
                          suffix="s"
                          value={step.seconds}
                          onChange={(value) => patchStep(index, { seconds: value ?? MIN_STEP_SECONDS })}
                          min={MIN_STEP_SECONDS}
                          max={MAX_STEP_SECONDS}
                          step={5}
                          stepper
                          className="flex-1"
                        />
                        <NumberField
                          id={`emom-step-${index}-reps`}
                          label="Wdh."
                          value={step.reps}
                          onChange={(value) => patchStep(index, { reps: value })}
                          min={1}
                          max={MAX_STEP_REPS}
                          placeholder="frei"
                          stepper
                          className="flex-1"
                        />
                      </div>

                      {index === 0 && steps.length === 1 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {PRESETS.map((seconds) => (
                            <button
                              key={seconds}
                              type="button"
                              onClick={() => patchStep(0, { seconds })}
                              className={cn(
                                "rounded-pill px-3 py-1 text-xs transition-colors",
                                step.seconds === seconds
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-elevated text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {seconds}s
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Die Pause zwischen zwei Schritten ist ein Übergang, kein
                        eigener Baustein — ein schmaler Steg statt einer Box.
                        Ob und wie lange pausiert wird, ist eine einzige
                        Einstellung oben ("Pause zwischen Übungen"); hier steht
                        deshalb nur noch die Anzeige, kein zweiter Ein-Aus-Knopf
                        pro Übergang — sonst sähe es nach mehreren getrennten
                        Pausen aus, wo es nur eine gibt. */}
                    {hasGapAfter && (
                      <div className="relative flex items-center py-1.5">
                        <span aria-hidden className="h-px flex-1 bg-border" />
                        {restEnabled && (
                          <span className="nums mx-2 shrink-0 text-[11px] text-muted-foreground">
                            {restSeconds ?? DEFAULT_REST_SECONDS}s Pause
                          </span>
                        )}
                        <span aria-hidden className="h-px flex-1 bg-border" />
                        {isLastStep && (
                          <span className="absolute inset-x-0 -bottom-1 text-center text-[10px] text-muted-foreground">
                            dann von vorn
                          </span>
                        )}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-border px-4 py-3 sm:px-5 sm:py-4">
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
