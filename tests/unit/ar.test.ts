import { describe, expect, it } from "vitest";
import { BODIES, BODY_ORDER } from "@/data/bodies";
import { arPlacement, quickLookScale } from "@/components/planet/ar";
import { stationArUrl } from "@/config/site";

describe("realidad aumentada a la escala del recorrido (1 UA = 2 km)", () => {
  it("el Sol mide unos 18,6 m y la Tierra unos 17 cm", () => {
    expect(arPlacement(BODIES.sol).diameterM).toBeCloseTo(18.6, 1);
    expect(arPlacement(BODIES.tierra).diameterM).toBeCloseTo(0.1705, 3);
    expect(arPlacement(BODIES.jupiter).diameterM).toBeCloseTo(1.91, 2);
    expect(arPlacement(BODIES.mercurio).diameterM).toBeCloseTo(0.0652, 3);
  });

  it("todos los cuerpos conservan entre sí la proporción real de tamaños", () => {
    for (const id of BODY_ORDER) {
      const ratio = arPlacement(BODIES[id]).diameterM / arPlacement(BODIES.tierra).diameterM;
      expect(ratio).toBeCloseTo(BODIES[id].diameterKm / BODIES.tierra.diameterKm, 6);
    }
  });

  it("cada cuerpo, con sus anillos, cabe completo en la pantalla del teléfono", () => {
    for (const id of BODY_ORDER) {
      const p = arPlacement(BODIES[id]);
      expect(p.extentM).toBeGreaterThanOrEqual(p.radiusM);
      // Semiancho angular bajo 17°: cabe en los ~36° de ancho de la cámara en vertical.
      const halfAngle = (Math.asin(p.extentM / Math.hypot(p.distanceM, p.liftM)) * 180) / Math.PI;
      expect(halfAngle).toBeLessThan(17);
      expect(p.distanceM).toBeGreaterThanOrEqual(0.5);
      // Nunca enterrado: el punto más bajo queda a lo más 60 cm bajo los ojos.
      expect(p.liftM - p.radiusM).toBeGreaterThanOrEqual(-0.6 - 1e-9);
    }
    expect(arPlacement(BODIES.saturno).extentM).toBeGreaterThan(arPlacement(BODIES.saturno).radiusM * 2);
  });

  it("en AR Quick Look solo el Sol se reduce", () => {
    expect(quickLookScale(BODIES.sol)).toBe(0.1);
    for (const id of BODY_ORDER) if (id !== "sol") expect(quickLookScale(BODIES[id])).toBe(1);
  });
});

describe("códigos QR de realidad aumentada", () => {
  it("la dirección lleva a la estación y pide abrir la realidad aumentada", () => {
    expect(stationArUrl("https://ejemplo.cl/", "sol")).toBe("https://ejemplo.cl/estacion/sol?ar=1");
    expect(new URL(stationArUrl("https://ejemplo.cl", "jupiter")).searchParams.get("ar")).toBe("1");
  });
});
