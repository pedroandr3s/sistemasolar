"use client";

import dynamic from "next/dynamic";

/** Usa la cámara y el navegador: solo en el cliente. */
export const QrScannerClient = dynamic(() => import("./QrScanner").then((m) => m.QrScanner), {
  ssr: false,
  loading: () => (
    <p className="wrap muted" role="status" style={{ paddingTop: 24 }}>
      Preparando el escáner…
    </p>
  ),
});
