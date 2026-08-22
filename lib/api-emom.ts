import {
  MAX_PREPARE_SECONDS,
  MAX_REST_SECONDS,
  MAX_ROUNDS,
  MAX_STEP_REPS,
  MAX_STEP_SECONDS,
  MIN_STEP_SECONDS,
  type EmomStep,
  type EmomTemplate,
} from "@/lib/emom";
import { readAll } from "@/lib/local-db";
import { ensureLocalData } from "@/lib/sync";
import { enqueue, flushQueue } from "@/lib/write-queue";
import { newId } from "@/lib/ids";

export type EmomInput = {
  name: string;
  prepareSeconds: number;
  rounds: number;
  steps: EmomStep[];
  restSeconds: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Dieselbe Bereinigung, die die Route serverseitig anwendet (parseSteps,
 * clamp) — hier gebraucht, damit eine offline angelegte Vorlage bis zum
 * Abgleich exakt so aussieht wie das, was der Server gleich daraus macht.
 * Der Editor liefert ohnehin nur gültige Werte; das hier ist die Absicherung
 * gegen ein stilles Auseinanderlaufen der beiden Stellen.
 */
function cleanEmomFields(params: EmomInput) {
  return {
    name: params.name.trim().slice(0, 60),
    prepareSeconds: Math.round(clamp(params.prepareSeconds || 0, 0, MAX_PREPARE_SECONDS)),
    rounds: Math.round(clamp(params.rounds || 1, 1, MAX_ROUNDS)),
    steps: params.steps.map((step) => ({
      seconds: Math.round(clamp(step.seconds, MIN_STEP_SECONDS, MAX_STEP_SECONDS)),
      reps: step.reps && step.reps > 0 ? Math.round(clamp(step.reps, 1, MAX_STEP_REPS)) : null,
      label: step.label.trim().slice(0, 80),
    })),
    restSeconds: Math.round(clamp(params.restSeconds || 0, 0, MAX_REST_SECONDS)),
  };
}

export async function fetchEmomTemplates(): Promise<EmomTemplate[]> {
  await ensureLocalData();
  return readAll<EmomTemplate>("emom");
}

export async function createEmomTemplate(params: EmomInput): Promise<EmomTemplate[]> {
  const existing = await readAll<EmomTemplate>("emom");
  const position = existing.reduce((max, t) => Math.max(max, t.position), -1) + 1;

  const template: EmomTemplate = { id: newId("emom"), position, ...cleanEmomFields(params) };
  await enqueue({ kind: "emom.save", template, isNew: true });
  void flushQueue();

  return [...existing, template];
}

export async function updateEmomTemplate(
  params: EmomInput & { id: string }
): Promise<EmomTemplate[]> {
  const existing = await readAll<EmomTemplate>("emom");
  const before = existing.find((t) => t.id === params.id);
  if (!before) throw new Error("Vorlage nicht gefunden");

  const template: EmomTemplate = { ...before, ...cleanEmomFields(params) };
  await enqueue({ kind: "emom.save", template, isNew: false });
  void flushQueue();

  return existing.map((t) => (t.id === params.id ? template : t));
}

export async function deleteEmomTemplate(id: string): Promise<EmomTemplate[]> {
  await enqueue({ kind: "emom.delete", id });
  void flushQueue();

  return (await readAll<EmomTemplate>("emom")).filter((t) => t.id !== id);
}
