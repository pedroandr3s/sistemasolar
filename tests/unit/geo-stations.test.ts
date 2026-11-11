import { describe, expect, it } from "vitest";
import {
  angleDelta,
  buildPolyline,
  cardinal,
  haversineMeters,
  initialBearing,
  pointAlong,
  projectOntoPolyline,
} from "@/lib/geo";
import { getRoute, ROUTE_META } from "@/lib/route";
import {
  computePlacements,
  getPlacements,
  legDistances,
  nextPlacement,
  previousPlacement,
  progressFraction,
} from "@/lib/stations";
import { STATIONS, type StationConfig } from "@/config/stations";
import { SCALE, scaleDenominator, sizeAtScaleMeters } from "@/config/scale";
import { computeOrientation, looksLikeVehicle, relativeArrowAngle, reliableMovementHeading } from "@/lib/orientation";
import { BODIES } from "@/data/bodies";

describe("geodesia", () => {
  it("haversine: 1° de latitud ≈ 111,2 km", () => {
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it("distancia plaza San Carlos – plaza San Fabián (línea recta) ≈ 39 km", () => {
    const d = haversineMeters(ROUTE_META.origen, ROUTE_META.destino);
    expect(d).toBeGreaterThan(38_000);
    expect(d).toBeLessThan(40_000);
  });

  it("rumbos y puntos cardinales", () => {
    expect(initialBearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 5);
    expect(initialBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 5);
    expect(initialBearing({ lat: 0, lng: 0 }, { lat: -1, lng: 0 })).toBeCloseTo(180, 5);
    expect(cardinal(0)).toBe("N");
    expect(cardinal(270)).toBe("O");
    expect(cardinal(225)).toBe("SO");
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
  });

  it("proyección sobre una polilínea simple", () => {
    const line = buildPolyline([
      [0, 0],
      [0, 0.01],
      [0.01, 0.01],
    ]);
    const p = projectOntoPolyline(line, { lat: 0.005, lng: 0.001 });
    expect(p.segmentIndex).toBe(0);
    expect(p.alongMeters).toBeCloseTo(556, -1);
    expect(p.offsetMeters).toBeCloseTo(111, -1);
    const mid = pointAlong(line, line.length / 2);
    expect(mid.point.lat).toBeGreaterThan(0.0099);
  });
});

describe("trazado del recorrido", () => {
  it("tiene la longitud registrada y va de San Carlos a San Fabián", () => {
    const route = getRoute();
    expect(route.length).toBeGreaterThan(43_000);
    expect(route.length).toBeLessThan(43_500);
    expect(Math.abs(route.length - ROUTE_META.largoSimplificadoM)).toBeLessThan(5);
    const first = route.points[0]!;
    const last = route.points[route.points.length - 1]!;
    expect(haversineMeters(first, ROUTE_META.origen)).toBeLessThan(150);
    expect(haversineMeters(last, ROUTE_META.destino)).toBeLessThan(150);
  });

  it("no es una línea recta (sigue la carretera)", () => {
    const route = getRoute();
    const straight = haversineMeters(route.points[0]!, route.points[route.points.length - 1]!);
    expect(route.length / straight).toBeGreaterThan(1.05);
    expect(route.points.length).toBeGreaterThan(50);
  });
});

describe("escala y estaciones", () => {
  it("la escala es 1 UA = 2 km (≈ 1 : 74,8 millones)", () => {
    expect(SCALE.metersPerAU).toBe(2000);
    expect(scaleDenominator()).toBeCloseTo(74_798_935.35, 1);
    expect(sizeAtScaleMeters(BODIES.sol.diameterKm)).toBeCloseTo(18.6, 1);
  });

  it("las ocho estaciones caben en el trazado y están en orden", () => {
    const list = getPlacements();
    expect(list).toHaveLength(8);
    let prev = -1;
    for (const p of list) {
      expect(p.fitsRoute).toBe(true);
      expect(p.alongRouteMeters).not.toBeNull();
      expect(p.alongRouteMeters!).toBeGreaterThan(prev);
      prev = p.alongRouteMeters!;
    }
    const urano = list.find((p) => p.station.id === "urano")!;
    expect(urano.modelMeters).toBeCloseTo(38_330, -2);
    const tierra = list.find((p) => p.station.id === "tierra")!;
    expect(tierra.modelMeters).toBeCloseTo(2000, -1);
  });

  it("ninguna ubicación aparece como verificada (no hay datos de terreno)", () => {
    for (const p of getPlacements()) expect(p.status).not.toBe("verificada");
  });

  it("estación siguiente y anterior según el sentido", () => {
    expect(nextPlacement("tierra")?.station.id).toBe("marte");
    expect(nextPlacement("tierra", "hacia-san-carlos")?.station.id).toBe("venus");
    expect(nextPlacement("urano")).toBeNull();
    expect(previousPlacement("sol")).toBeNull();
    expect(nextPlacement("desconocida")).toBeNull();
  });

  it("distingue las tres distancias de un tramo", () => {
    const list = getPlacements();
    const leg = legDistances(list[3]!, list[4]!); // Tierra → Marte
    expect(leg.modelMeters).toBeCloseTo(1048, -1);
    expect(leg.alongRouteMeters!).toBeCloseTo(leg.modelMeters, 0); // propuestas: sobre la ruta = escala
    expect(leg.straightMeters!).toBeLessThanOrEqual(leg.alongRouteMeters! + 1);
  });

  it("maneja coordenadas ausentes (estación pendiente)", () => {
    const stations: StationConfig[] = STATIONS.map((s) =>
      s.id === "marte" ? { ...s, location: { status: "pendiente" } } : s,
    );
    const list = computePlacements(stations, getRoute(), SCALE);
    const marte = list.find((p) => p.station.id === "marte")!;
    expect(marte.coords).toBeNull();
    expect(marte.alongRouteMeters).toBeNull();
    expect(marte.status).toBe("pendiente");
    expect(legDistances(list[3]!, marte).straightMeters).toBeNull();
  });

  it("usa las coordenadas verificadas cuando existen", () => {
    const route = getRoute();
    const { point: target, bearing } = pointAlong(route, 9_000);
    // Desplazar 40 m perpendicular a la carretera.
    const perp = ((bearing + 90) * Math.PI) / 180;
    const dLat = (40 * Math.cos(perp)) / 111_195;
    const dLng = (40 * Math.sin(perp)) / (111_195 * Math.cos((target.lat * Math.PI) / 180));
    const stations: StationConfig[] = STATIONS.map((s) =>
      s.id === "jupiter"
        ? {
            ...s,
            location: {
              status: "verificada",
              lat: target.lat + dLat,
              lng: target.lng + dLng,
              verifiedBy: "prueba",
              verifiedOn: "2026-10-17",
            },
          }
        : s,
    );
    const list = computePlacements(stations, route, SCALE);
    const jup = list.find((p) => p.station.id === "jupiter")!;
    expect(jup.status).toBe("verificada");
    expect(jup.alongRouteMeters!).toBeCloseTo(9_000, -2);
    expect(jup.offsetFromRouteMeters!).toBeGreaterThan(30);
    expect(jup.offsetFromRouteMeters!).toBeLessThan(45);
  });

  it("marca como pendiente una estación que no cabe en el trazado", () => {
    const list = computePlacements(STATIONS, getRoute(), { ...SCALE, metersPerAU: 3000 });
    expect(list.find((p) => p.station.id === "urano")!.status).toBe("pendiente");
    expect(list.find((p) => p.station.id === "urano")!.fitsRoute).toBe(false);
  });

  it("progreso entre el Sol y Urano", () => {
    const list = getPlacements();
    expect(progressFraction(list[0]!.alongRouteMeters!)).toBe(0);
    expect(progressFraction(list[7]!.alongRouteMeters!)).toBe(1);
    expect(progressFraction(-100)).toBe(0);
  });
});

describe("orientación", () => {
  const route = getRoute();
  const list = getPlacements();

  it("en la estación Tierra apunta a Marte (hacia San Fabián)", () => {
    const tierra = list[3]!.coords!;
    const r = computeOrientation({ ...tierra, accuracy: 8, timestamp: 0 }, list, route, "hacia-san-fabian");
    expect(r.atStation?.station.id).toBe("tierra");
    expect(r.target?.station.id).toBe("marte");
    expect(r.alongRouteMetersToTarget!).toBeCloseTo(1048, -1);
    expect(r.confidence).toBe("alta");
  });

  it("en sentido contrario apunta a Venus", () => {
    const tierra = list[3]!.coords!;
    const r = computeOrientation({ ...tierra, accuracy: 8, timestamp: 0 }, list, route, "hacia-san-carlos");
    expect(r.target?.station.id).toBe("venus");
  });

  it("entre Júpiter y Saturno, la siguiente es Saturno aunque el QR fuera de otra estación", () => {
    const between = pointAlong(route, 14_000).point;
    const r = computeOrientation({ ...between, accuracy: 15, timestamp: 0 }, list, route, "hacia-san-fabian");
    expect(r.atStation).toBeNull();
    expect(r.target?.station.id).toBe("saturno");
    expect(r.nearest?.placement.station.id).toBe("jupiter");
  });

  it("baja la confianza con mala precisión del GPS", () => {
    const tierra = list[3]!.coords!;
    const r = computeOrientation({ ...tierra, accuracy: 400, timestamp: 0 }, list, route, "hacia-san-fabian");
    expect(r.confidence).toBe("baja");
  });

  it("detecta cuando el visitante está lejos del recorrido", () => {
    const santiago = { lat: -33.45, lng: -70.66 };
    const r = computeOrientation({ ...santiago, accuracy: 10, timestamp: 0 }, list, route, "hacia-san-fabian");
    expect(r.farFromRoute).toBe(true);
  });

  it("después de Urano no hay estación siguiente", () => {
    const urano = list[7]!.coords!;
    const r = computeOrientation({ ...urano, accuracy: 5, timestamp: 0 }, list, route, "hacia-san-fabian");
    expect(r.target).toBeNull();
  });

  it("flecha relativa y rumbo de movimiento", () => {
    expect(relativeArrowAngle(90, 0)).toBe(90);
    expect(relativeArrowAngle(10, 350)).toBe(20);
    expect(reliableMovementHeading({ lat: 0, lng: 0, accuracy: 5, heading: 45, speed: 0.2, timestamp: 0 })).toBeNull();
    expect(reliableMovementHeading({ lat: 0, lng: 0, accuracy: 5, heading: 45, speed: 1.5, timestamp: 0 })).toBe(45);
  });

  it("avisa de velocidad de vehículo solo con un dato de velocidad confiable", () => {
    expect(looksLikeVehicle(null)).toBe(false);
    expect(looksLikeVehicle({ speed: null, accuracy: 5 })).toBe(false);
    expect(looksLikeVehicle({ speed: 1.4, accuracy: 5 })).toBe(false); // caminando
    expect(looksLikeVehicle({ speed: 4, accuracy: 5 })).toBe(false); // trotando o en bicicleta lenta
    expect(looksLikeVehicle({ speed: 16.7, accuracy: 8 })).toBe(true); // 60 km/h
    expect(looksLikeVehicle({ speed: 16.7, accuracy: 120 })).toBe(false); // GPS demasiado impreciso
  });
});
