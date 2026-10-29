import type { Metadata } from "next";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { LiveQrClient } from "@/components/qr/LiveQrClient";

export const metadata: Metadata = { title: "QR de prueba", robots: { index: false } };

export default function QrPage() {
  return (
    <GlobalShell>
      <LiveQrClient />
    </GlobalShell>
  );
}
