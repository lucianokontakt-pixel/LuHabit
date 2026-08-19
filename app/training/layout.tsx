import { TrainingProvider } from "@/lib/training-store";

export default function TrainingLayout({ children }: LayoutProps<"/training">) {
  return <TrainingProvider>{children}</TrainingProvider>;
}
