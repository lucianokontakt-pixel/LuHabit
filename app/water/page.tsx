import { redirect } from "next/navigation";

// Legacy-Route: alle Habits leben inzwischen unter /habit/[id].
export default function LegacyHabitPage() {
  redirect("/habit/water");
}
