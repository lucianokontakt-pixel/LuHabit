"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_HABIT_SUGGESTIONS, HabitConfig, iconForName } from "@/lib/habits";
import {
  fetchCustomHabits,
  createCustomHabit,
  updateCustomHabit,
  deleteCustomHabit,
  type CustomHabit,
} from "@/lib/api-client";

type HabitFormInput = {
  label: string;
  unit: string;
  icon: string;
  defaultGoal: number;
  quickAdd: number[];
  step: number;
};

type RegistryContextValue = {
  habits: Record<string, HabitConfig>;
  order: string[];
  loading: boolean;
  suggestions: HabitConfig[];
  addCustomHabit: (params: HabitFormInput) => Promise<string>;
  editCustomHabit: (id: string, params: HabitFormInput) => Promise<void>;
  removeCustomHabit: (id: string) => Promise<void>;
};

const RegistryContext = createContext<RegistryContextValue | null>(null);

function toConfig(c: CustomHabit): HabitConfig {
  return {
    type: c.id,
    label: c.label,
    unit: c.unit,
    icon: iconForName(c.icon),
    defaultGoal: c.defaultGoal,
    quickAdd: c.quickAdd,
    step: c.step,
    isCustom: true,
  };
}

export function HabitRegistryProvider({ children }: { children: React.ReactNode }) {
  const [customs, setCustoms] = useState<CustomHabit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCustomHabits();
      setCustoms(data);
    } catch {
      // Habits sind für die Kernfunktion nötig, Fehler beim Laden zeigt sich als leere Liste
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    load();
  }, [load]);

  const habits: Record<string, HabitConfig> = {};
  for (const c of customs) habits[c.id] = toConfig(c);
  const order = customs.map((c) => c.id);
  const suggestions = DEFAULT_HABIT_SUGGESTIONS.filter((s) => !habits[s.type]);

  const addCustomHabit: RegistryContextValue["addCustomHabit"] = useCallback(async (params) => {
    const created = await createCustomHabit(params);
    setCustoms((prev) => [...prev, created]);
    return created.id;
  }, []);

  const editCustomHabit: RegistryContextValue["editCustomHabit"] = useCallback(
    async (id, params) => {
      const updated = await updateCustomHabit(id, params);
      setCustoms((prev) => prev.map((c) => (c.id === id ? updated : c)));
    },
    []
  );

  const removeCustomHabit = useCallback(async (id: string) => {
    await deleteCustomHabit(id);
    setCustoms((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <RegistryContext.Provider
      value={{ habits, order, loading, suggestions, addCustomHabit, editCustomHabit, removeCustomHabit }}
    >
      {children}
    </RegistryContext.Provider>
  );
}

export function useHabitRegistry() {
  const ctx = useContext(RegistryContext);
  if (!ctx) throw new Error("useHabitRegistry muss innerhalb von HabitRegistryProvider genutzt werden");
  return ctx;
}
