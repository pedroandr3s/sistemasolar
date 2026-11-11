import { describe, expect, it } from "vitest";
import { headingFromDeviceOrientation, magneticToTrueHeading } from "@/lib/orientation";
import { decimalYear, magneticDeclination } from "@/lib/declination";

/** Diferencia angular mínima en grados. */
function angDiff(a: number, b: number): number {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
}

describe("rumbo del teléfono a partir de alpha, beta y gamma", () => {
  it("horizontal: coincide con 360 − alpha (fórmula clásica)", () => {
    for (const alpha of [0, 30, 90, 200, 359]) {
      expect(angDiff(headingFromDeviceOrientation(alpha, 0, 0)!, (360 - alpha) % 360)).toBeLessThan(1e-6);
    }
  });

  it("horizontal e inclinado de lado: el rumbo no cambia", () => {
    for (const gamma of [-40, -10, 15, 40]) {
      expect(angDiff(headingFromDeviceOrientation(70, 0, gamma)!, 290)).toBeLessThan(1e-6);
    }
  });

  it("inclinado hacia la persona (como al mirar la pantalla) mantiene el rumbo", () => {
    for (const beta of [20, 45, 60, 75, 85]) {
      expect(angDiff(headingFromDeviceOrientation(120, beta, 0)!, 240)).toBeLessThan(1e-6);
    }
  });

  it("vertical: usa la parte trasera y sigue definido", () => {
    expect(angDiff(headingFromDeviceOrientation(120, 90, 0)!, 240)).toBeLessThan(1e-6);
  });

  it("es continuo al cruzar la vertical (sin saltos de 180°)", () => {
    const a = headingFromDeviceOrientation(40, 88, 3)!;
    const b = headingFromDeviceOrientation(40, 90, 3)!;
    const c = headingFromDeviceOrientation(40, 92, 3)!;
    expect(angDiff(a, b)).toBeLessThan(5);
    expect(angDiff(b, c)).toBeLessThan(5);
  });

  it("corrige la rotación de la pantalla (horizontal y en modo apaisado)", () => {
    expect(angDiff(headingFromDeviceOrientation(10, 0, 0, 90)!, (360 - 10 + 90) % 360)).toBeLessThan(1e-6);
    expect(angDiff(headingFromDeviceOrientation(10, 0, 0, 270)!, (360 - 10 + 270) % 360)).toBeLessThan(1e-6);
  });
});

describe("declinación magnética (WMM2025)", () => {
  // Valores de prueba oficiales de NOAA NCEI para el WMM2025 (altura 0 km).
  const NOAA: [number, number, number, number][] = [
    [2025.0, 80, 0, 1.28],
    [2025.0, 0, 120, -0.16],
    [2025.0, -80, 240, 68.78],
    [2027.5, 80, 0, 2.59],
    [2027.5, 0, 120, -0.24],
    [2027.5, -80, 240, 68.49],
  ];

  it("reproduce los valores de prueba oficiales del modelo", () => {
    for (const [year, lat, lon, expected] of NOAA) {
      const y = Math.floor(year);
      const date = new Date(Date.UTC(y, 0, 1) + (year - y) * (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)));
      expect(decimalYear(date)).toBeCloseTo(year, 6);
      expect(magneticDeclination(lat, lon > 180 ? lon - 360 : lon, date).degrees).toBeCloseTo(expected, 1);
    }
  });

  it("en la ruta San Carlos–San Fabián es de unos 3° al este en 2026", () => {
    const d = magneticDeclination(-36.4249, -71.9581, new Date("2026-10-18T12:00:00Z"));
    expect(d.withinValidity).toBe(true);
    expect(d.degrees).toBeGreaterThan(2);
    expect(d.degrees).toBeLessThan(4.5);
  });

  it("avisa cuando la fecha sale del período de validez del modelo", () => {
    expect(magneticDeclination(-36.4, -72, new Date("2031-01-01T00:00:00Z")).withinValidity).toBe(false);
  });

  it("pasa de rumbo magnético a geográfico", () => {
    expect(magneticToTrueHeading(358, 3.1)).toBeCloseTo(1.1, 6);
    expect(magneticToTrueHeading(10, -12)).toBeCloseTo(358, 6);
  });
});
