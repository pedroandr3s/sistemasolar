"use client";

import dynamic from "next/dynamic";

/** El diagnóstico lee capacidades del navegador: se renderiza solo en el cliente. */
export const DiagnosticsClient = dynamic(() => import("./Diagnostics").then((m) => m.Diagnostics), {
  ssr: false,
  loading: () => (
    <p className="wrap muted" role="status" style={{ paddingTop: 24 }}>
      Revisando el dispositivo…
    </p>
  ),
});
