import type { Metadata } from "next";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { OrbitsModeClient } from "@/components/orbits/OrbitsModeClient";

export const metadata: Metadata = { title: "Sistema solar hoy" };

export default function OrbitsPage() {
  return (
    <GlobalShell>
      <OrbitsModeClient />
    </GlobalShell>
  );
}
