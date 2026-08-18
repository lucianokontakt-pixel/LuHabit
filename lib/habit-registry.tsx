"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { HABITS, HABIT_ORDER, HabitConfig, iconForName } from "@/lib/habits";
import {
  fetchCustomHabits,
  createCustomHabit,
  deleteCustomHabit,
  type CustomHabit,
} from "@/lib/api-client";

type RegistryContextValue = {
  habits: Record<string, HabitConfig>;
  order: string[];
  customOrder: string[];
  loading: boolean;
  addCustomHabit: (params: {
    label: string;
    unit: string;
    icon: string;
    defaultGoal: number;
    quickAdd: number[];
    step: number;
  }) => Promise<string>;
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
      // eigene Habits sind optional — Fehler beim Laden blockiert die App nicht
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf beim Mount
    load();
  }, [load]);

  const habits: Record<string, HabitConfig> = { ...HABITS };
  for (const c of customs) habits[c.id] = toConfig(c);
  const customOrder = customs.map((c) => c.id);
  const order = [...HABIT_ORDER, ...customOrder];

  const addCustomHabit: RegistryContextValue["addCustomHabit"] = useCallback(
    async (params) => {
      const created = await createCustomHabit(params);
      setCustoms((prev) => [...prev, created]);
      return created.id;
    },
    []
  );

  const removeCustomHabit = useCallback(async (id: string) => {
    await deleteCustomHabit(id);
    setCustoms((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <RegistryContext.Provider
      value={{ habits, order, customOrder, loading, addCustomHabit, removeCustomHabit }}
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
