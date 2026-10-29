import type { Metadata } from "next";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { MapMode } from "@/components/map/MapMode";

export const metadata: Metadata = { title: "Mapa del recorrido" };

export default function MapPage() {
  return (
    <GlobalShell>
      <MapMode />
    </GlobalShell>
  );
}
