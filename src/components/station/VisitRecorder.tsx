"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/progress";

/** Registra en este teléfono que se abrió la página de la estación (por QR o enlace). */
export function VisitRecorder({ stationId }: { stationId: string }) {
  useEffect(() => {
    recordVisit(stationId);
  }, [stationId]);
  return null;
}
