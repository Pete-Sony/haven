import type { Metadata } from "next";
import { PreventionPlanner } from "@/features/prevention/PreventionPlanner";

export const metadata: Metadata = {
  title: "Plan ahead",
  description:
    "Build a zero-typing, device-private prevention plan for a difficult substance-use moment.",
};

export default function PreventPage() {
  return <PreventionPlanner />;
}
