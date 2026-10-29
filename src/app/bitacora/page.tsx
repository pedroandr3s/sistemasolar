import type { Metadata } from "next";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { Bitacora } from "@/components/progress/Bitacora";

export const metadata: Metadata = { title: "Mi bitácora" };

export default function BitacoraPage() {
  return (
    <GlobalShell>
      <Bitacora />
    </GlobalShell>
  );
}
