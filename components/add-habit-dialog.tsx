"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HabitFormDialog, type HabitFormResult } from "@/components/habit-form-dialog";
import { useHabitRegistry } from "@/lib/habit-registry";
import { cn } from "@/lib/utils";

export function AddHabitDialog() {
  const { addCustomHabit, suggestions } = useHabitRegistry();
  const [open, setOpen] = useState(false);

  async function handleSubmit(result: HabitFormResult) {
    await addCustomHabit(result);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <Plus className="size-3.5" />
        Neues Ziel
      </button>
      <HabitFormDialog
        open={open}
        onOpenChange={setOpen}
        suggestions={suggestions}
        onSubmit={handleSubmit}
      />
    </>
  );
}
