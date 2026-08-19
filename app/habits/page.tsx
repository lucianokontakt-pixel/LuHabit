import { redirect } from "next/navigation";

// Der Habits-Tab ist entfallen — die Übersicht zeigt bereits alle Karten.
export default function LegacyHabitsPage() {
  redirect("/");
}
