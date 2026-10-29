import type { Metadata } from "next";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { DiagnosticsClient } from "@/components/diag/DiagnosticsClient";

export const metadata: Metadata = { title: "Diagnóstico", robots: { index: false } };

export default function DiagnosticsPage() {
  return (
    <GlobalShell>
      <DiagnosticsClient />
    </GlobalShell>
  );
}
