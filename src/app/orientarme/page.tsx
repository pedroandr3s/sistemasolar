import type { Metadata } from "next";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { OrientMode } from "@/components/orient/OrientMode";

export const metadata: Metadata = { title: "Orientarme" };

export default function OrientPage() {
  return (
    <GlobalShell>
      <OrientMode />
    </GlobalShell>
  );
}
