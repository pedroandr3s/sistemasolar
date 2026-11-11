import type { Metadata } from "next";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { LearnMode } from "@/components/learn/LearnMode";

export const metadata: Metadata = { title: "Aprender" };

export default function LearnPage() {
  return (
    <GlobalShell>
      <LearnMode />
    </GlobalShell>
  );
}
