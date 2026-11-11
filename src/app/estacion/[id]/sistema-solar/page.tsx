import type { Metadata } from "next";
import { OrbitsModeClient } from "@/components/orbits/OrbitsModeClient";
import { isBodyId } from "@/data/bodies";
import type { PlanetId } from "@/lib/astro";

export const metadata: Metadata = { title: "Sistema solar hoy" };

export default async function StationOrbitsPage({ params }: PageProps<"/estacion/[id]/sistema-solar">) {
  const { id } = await params;
  const initial: PlanetId | null = isBodyId(id) && id !== "sol" ? id : null;
  return <OrbitsModeClient initialSelected={initial} />;
}
