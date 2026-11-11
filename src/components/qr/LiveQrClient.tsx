"use client";

import dynamic from "next/dynamic";

/** Depende de la dirección del navegador: solo en el cliente. */
export const LiveQrClient = dynamic(() => import("./LiveQr").then((m) => m.LiveQr), {
  ssr: false,
  loading: () => (
    <p className="wrap muted" role="status" style={{ paddingTop: 24 }}>
      Generando códigos…
    </p>
  ),
});
