"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";
import { looksLikeVehicle, type UserFix } from "@/lib/orientation";

/**
 * Aviso cuando el GPS indica velocidad de vehículo. No bloquea la app (un
 * pasajero puede seguir usándola), pero recuerda que no se usa al conducir.
 */
export function VehicleWarning({ fix }: { fix: UserFix | null }) {
  const [passenger, setPassenger] = useState(false);
  if (passenger || !looksLikeVehicle(fix) || !fix?.speed) return null;
  const kmh = fix.speed * 3.6;
  return (
    <div className="notice notice--alert" role="alert" style={{ marginTop: 12 }}>
      <Icon name="warning" />
      <div>
        <p style={{ margin: 0, fontWeight: 600 }}>Parece que vas en un vehículo (unos {formatNumber(kmh, 0)} km/h).</p>
        <p style={{ margin: "4px 0 10px" }}>
          Si conduces, deja el teléfono: la app puede esperar a que te detengas en un lugar seguro.
        </p>
        <button type="button" className="btn btn--small" onClick={() => setPassenger(true)}>
          Soy pasajero
        </button>
      </div>
    </div>
  );
}
