"use client";

import dynamic from "next/dynamic";
import type { PlanetId } from "@/lib/astro";

/** La simulación depende de la hora del teléfono: se renderiza solo en el cliente. */
const OrbitsMode = dynamic(() => import("./OrbitsMode").then((m) => m.OrbitsMode), {
  ssr: false,
  loading: () => (
    <div className="wrap" style={{ paddingTop: 24 }} role="status">
      <p className="muted">Calculando la posición de los planetas…</p>
    </div>
  ),
});

export function OrbitsModeClient({ initialSelected }: { initialSelected?: PlanetId | null }) {
  return <OrbitsMode initialSelected={initialSelected ?? null} />;
}
