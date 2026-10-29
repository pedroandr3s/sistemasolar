import type { Metadata } from "next";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { QrScannerClient } from "@/components/qr/QrScannerClient";

export const metadata: Metadata = {
  title: "Escanear QR",
  description: "Escanea el código QR de una escultura para abrir su planeta en 3D y realidad aumentada.",
};

export default function ScanPage() {
  return (
    <GlobalShell>
      <QrScannerClient />
    </GlobalShell>
  );
}
