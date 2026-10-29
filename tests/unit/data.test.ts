import { describe, expect, it } from "vitest";
import { AU_KM, BODIES, BODY_ORDER, meanDistanceAU, type BodyId } from "@/data/bodies";
import { SOURCES } from "@/data/sources";
import { STATIONS } from "@/config/stations";
import { existsSync } from "node:fs";
import { join } from "node:path";

describe("datos científicos", () => {
  it("define los ocho cuerpos en orden", () => {
    expect(BODY_ORDER).toEqual(["sol", "mercurio", "venus", "tierra", "marte", "jupiter", "saturno", "urano"]);
    BODY_ORDER.forEach((id, i) => expect(BODIES[id].order).toBe(i));
  });

  it("cada cuerpo tiene los campos esenciales y tres niveles de contenido", () => {
    for (const id of BODY_ORDER) {
      const b = BODIES[id];
      expect(b.name.length).toBeGreaterThan(2);
      expect(b.diameterKm).toBeGreaterThan(1000);
      expect(b.massKg).toBeGreaterThan(1e22);
      expect(b.hook.length).toBeGreaterThan(20);
      expect(b.keyIdea.length).toBeGreaterThan(20);
      expect(b.discover.length).toBeGreaterThanOrEqual(3);
      expect(b.understand.length).toBeGreaterThanOrEqual(3);
      expect(b.deep.length).toBeGreaterThanOrEqual(3);
      expect(b.quiz).toHaveLength(3);
      for (const q of b.quiz) {
        expect(q.options).toHaveLength(3);
        expect([0, 1, 2]).toContain(q.correct);
        expect(q.explanation.length).toBeGreaterThan(10);
      }
      expect(SOURCES[b.dataSource]).toBeDefined();
      if (b.moons) {
        expect(SOURCES[b.moons.source]).toBeDefined();
        expect(b.moons.asOf).toMatch(/^\d{4}-\d{2}$/);
      }
    }
  });

  it("las cifras coinciden con la ficha de NASA (muestras)", () => {
    expect(BODIES.tierra.diameterKm).toBe(12_756);
    expect(BODIES.jupiter.diameterKm).toBe(142_984);
    expect(BODIES.saturno.densityKgM3).toBeLessThan(1000); // flotaría en agua
    expect(BODIES.venus.rotationPeriodHours).toBeLessThan(0); // retrógrada
    expect(BODIES.urano.obliquityDeg).toBeCloseTo(97.8, 1);
    expect(BODIES.sol.diameterKm / BODIES.tierra.diameterKm).toBeCloseTo(109.1, 0);
  });

  it("las masas relativas son coherentes con la masa en kg", () => {
    const earth = BODIES.tierra.massKg;
    for (const id of BODY_ORDER) {
      const b = BODIES[id];
      const ratio = b.massKg / earth;
      expect(Math.abs(ratio - b.massEarths) / b.massEarths).toBeLessThan(0.01);
    }
  });

  it("las distancias medias en UA tienen valores esperados", () => {
    const au = (id: BodyId) => meanDistanceAU(BODIES[id])!;
    expect(au("tierra")).toBeCloseTo(1.0, 2);
    expect(au("mercurio")).toBeCloseTo(0.387, 2);
    expect(au("jupiter")).toBeCloseTo(5.204, 2);
    expect(au("urano")).toBeCloseTo(19.165, 2);
    expect(meanDistanceAU(BODIES.sol)).toBeNull();
    expect(AU_KM).toBe(149_597_870.7);
  });

  it("las texturas declaradas existen en public/", () => {
    for (const id of BODY_ORDER) {
      const r = BODIES[id].render;
      const files = [r.texture?.low, r.texture?.high, r.bump, r.clouds?.texture, r.cloudCover, r.rings?.texture].filter(
        (f): f is string => Boolean(f),
      );
      for (const f of files) expect(existsSync(join(process.cwd(), "public", f)), f).toBe(true);
    }
  });

  it("cada estación apunta a un cuerpo existente y tiene identificador apto para URL", () => {
    expect(STATIONS).toHaveLength(8);
    const ids = new Set<string>();
    for (const s of STATIONS) {
      expect(BODIES[s.bodyId]).toBeDefined();
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });
});
