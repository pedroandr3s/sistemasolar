import { describe, expect, it } from "vitest";
import {
  allPlanetStates,
  distanceAU,
  eclipticLonLat,
  heliocentricEcliptic,
  length,
  orbitPath,
  scaleVector,
  subsolarPoint,
} from "@/lib/astro";
import {
  chileOffsetMinutes,
  chileUtcLabel,
  formatChileDateTime,
  parseChileInputValue,
  toChileInputValue,
} from "@/lib/time";
import { formatDistance, formatNumber, formatScientific, formatDurationHours } from "@/lib/format";
import { validateSiteUrl, stationUrl } from "@/config/site";

describe("posiciones planetarias (Astronomy Engine)", () => {
  it("la Tierra está en el perihelio a comienzos de enero y en el afelio a comienzos de julio", () => {
    const peri = length(heliocentricEcliptic("tierra", new Date(Date.UTC(2026, 0, 3, 17))));
    const aph = length(heliocentricEcliptic("tierra", new Date(Date.UTC(2026, 6, 6, 18))));
    expect(peri).toBeCloseTo(0.9833, 3);
    expect(aph).toBeCloseTo(1.0166, 3);
  });

  it("en el equinoccio de marzo la Tierra vista desde el Sol está a longitud eclíptica ≈ 180°", () => {
    // Equinoccio: 20-03-2026 14:46 UTC. El Sol (visto desde la Tierra) a 0° → la Tierra (desde el Sol) a 180°.
    const v = heliocentricEcliptic("tierra", new Date(Date.UTC(2026, 2, 20, 14, 46)));
    const { lon, lat } = eclipticLonLat(v);
    expect(lon).toBeCloseTo(180, 0);
    expect(Math.abs(lat)).toBeLessThan(0.01);
  });

  it("distancias heliocéntricas dentro de perihelio y afelio", () => {
    const states = allPlanetStates(new Date());
    const ranges: Record<string, [number, number]> = {
      mercurio: [0.3, 0.47],
      venus: [0.71, 0.73],
      tierra: [0.98, 1.02],
      marte: [1.38, 1.67],
      jupiter: [4.95, 5.46],
      saturno: [9.0, 10.1],
      urano: [18.2, 20.1],
    };
    for (const s of states) {
      const [lo, hi] = ranges[s.id]!;
      expect(s.distanceAU, s.id).toBeGreaterThan(lo);
      expect(s.distanceAU, s.id).toBeLessThan(hi);
    }
  });

  it("las órbitas conservan su inclinación (Mercurio ~7°)", () => {
    const path = orbitPath("mercurio", new Date(Date.UTC(2026, 9, 17)), 120);
    const maxLat = Math.max(...path.map((p) => Math.abs(eclipticLonLat(p).lat)));
    expect(maxLat).toBeGreaterThan(6.5);
    expect(maxLat).toBeLessThan(7.5);
    expect(path).toHaveLength(121);
  });

  it("la escala comprimida conserva la dirección", () => {
    const v = heliocentricEcliptic("jupiter", new Date(Date.UTC(2026, 9, 17)));
    const c = scaleVector(v, "comprimida", 10);
    const r = scaleVector(v, "real", 10);
    expect(length(c)).toBeCloseTo(Math.sqrt(length(v)) * 10, 6);
    expect(length(r)).toBeCloseTo(length(v) * 10, 6);
    const dot = (c.x * v.x + c.y * v.y + c.z * v.z) / (length(c) * length(v));
    expect(dot).toBeCloseTo(1, 9);
  });

  it("distancia entre planetas: Tierra–Marte entre 0,37 y 2,7 UA", () => {
    const d = new Date(Date.UTC(2026, 9, 17));
    const dist = distanceAU(heliocentricEcliptic("tierra", d), heliocentricEcliptic("marte", d));
    expect(dist).toBeGreaterThan(0.37);
    expect(dist).toBeLessThan(2.7);
  });

  it("punto subsolar: solsticio de junio sobre el trópico de Cáncer, mediodía UTC cerca de Greenwich", () => {
    const s = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 8, 25)));
    expect(s.lat).toBeCloseTo(23.44, 1);
    const noon = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 12, 0)));
    expect(Math.abs(noon.lat)).toBeLessThan(0.5);
    expect(Math.abs(noon.lon)).toBeLessThan(3); // ecuación del tiempo ≈ −7 min ≈ 2°
  });
});

describe("fechas en hora de Chile (UTC internamente)", () => {
  it("desfase de verano (UTC−3) y de invierno (UTC−4)", () => {
    expect(chileOffsetMinutes(new Date(Date.UTC(2026, 0, 15, 12)))).toBe(-180);
    expect(chileOffsetMinutes(new Date(Date.UTC(2026, 6, 15, 12)))).toBe(-240);
    expect(chileUtcLabel(new Date(Date.UTC(2026, 0, 15, 12)))).toBe("UTC−3");
  });

  it("convierte hora local a UTC y de vuelta", () => {
    const d = parseChileInputValue("2026-01-15T12:00")!;
    expect(d.toISOString()).toBe("2026-01-15T15:00:00.000Z");
    const w = parseChileInputValue("2026-07-15T12:00")!;
    expect(w.toISOString()).toBe("2026-07-15T16:00:00.000Z");
    expect(toChileInputValue(w)).toBe("2026-07-15T12:00");
  });

  it("ida y vuelta para muchas fechas del año", () => {
    for (let i = 0; i < 365; i += 7) {
      const t = new Date(Date.UTC(2026, 0, 1, 17, 30) + i * 86_400_000);
      expect(parseChileInputValue(toChileInputValue(t))!.getTime()).toBe(t.getTime());
    }
  });

  it("rechaza valores inválidos", () => {
    expect(parseChileInputValue("hola")).toBeNull();
    expect(parseChileInputValue("2026-13-01T10:00")).toBeNull();
  });

  it("formatea en español", () => {
    const s = formatChileDateTime(new Date(Date.UTC(2026, 9, 17, 21, 56)));
    expect(s).toContain("octubre");
    expect(s).toContain("18:56");
  });
});

describe("formato numérico", () => {
  it("usa punto de miles y coma decimal", () => {
    expect(formatNumber(4879)).toBe("4.879");
    expect(formatNumber(149597870.7, 1)).toBe("149.597.870,7");
    expect(formatNumber(-65)).toBe("−65");
    expect(formatDistance(770)).toBe("770 m");
    expect(formatDistance(2000)).toBe("2,0 km");
    expect(formatDistance(38_330)).toBe("38,3 km");
    expect(formatScientific(1.9884e30)).toBe("1,988 × 10³⁰");
    expect(formatDurationHours(9.9)).toBe("9 h 54 min");
    expect(formatDurationHours(-5832.5)).toBe("243 días");
  });
});

describe("validación de la URL base de los QR", () => {
  it("acepta un dominio HTTPS real en producción", () => {
    const r = validateSiteUrl("https://sistemasolar.sancarlos.cl/", "produccion");
    expect(r.ok).toBe(true);
    expect(r.url).toBe("https://sistemasolar.sancarlos.cl");
    expect(stationUrl(r.url!, "tierra")).toBe("https://sistemasolar.sancarlos.cl/estacion/tierra");
  });

  it("rechaza URL vacías, de ejemplo, HTTP, locales y túneles en producción", () => {
    expect(validateSiteUrl("", "produccion").ok).toBe(false);
    expect(validateSiteUrl(undefined, "produccion").ok).toBe(false);
    expect(validateSiteUrl("https://example.com", "produccion").ok).toBe(false);
    expect(validateSiteUrl("https://DOMINIO-CONFIGURADO", "produccion").ok).toBe(false);
    expect(validateSiteUrl("http://sistemasolar.cl", "produccion").ok).toBe(false);
    expect(validateSiteUrl("https://192.168.1.20:3000", "produccion").ok).toBe(false);
    expect(validateSiteUrl("https://abc-def.trycloudflare.com", "produccion").ok).toBe(false);
    expect(validateSiteUrl("https://sistemasolar.cl/estacion", "produccion").ok).toBe(false);
    expect(validateSiteUrl("no es url", "produccion").ok).toBe(false);
  });

  it("en desarrollo acepta red local y túneles con advertencias, pero no localhost", () => {
    const lan = validateSiteUrl("http://192.168.1.20:3000", "desarrollo");
    expect(lan.ok).toBe(true);
    expect(lan.warnings.length).toBeGreaterThan(0);
    const tunnel = validateSiteUrl("https://abc-def.trycloudflare.com", "desarrollo");
    expect(tunnel.ok).toBe(true);
    expect(validateSiteUrl("http://localhost:3000", "desarrollo").ok).toBe(false);
  });

  it("no confunde dominios legítimos que contienen la palabra «dominio»", () => {
    expect(validateSiteUrl("https://condominio.cl", "produccion").ok).toBe(true);
  });
});
