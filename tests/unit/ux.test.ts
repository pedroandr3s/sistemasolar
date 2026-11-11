import { describe, expect, it } from "vitest";
import { BODIES, BODY_ORDER } from "@/data/bodies";
import { quickFacts } from "@/components/station/QuickFacts";
import { stationPathFromQr } from "@/lib/qr-scan";

describe("textos a la vista en cada parada", () => {
  it("la frase gancho tiene como máximo 12 palabras", () => {
    for (const id of BODY_ORDER) {
      const words = BODIES[id].hook.trim().split(/\s+/).length;
      expect(words, `${id}: «${BODIES[id].hook}»`).toBeLessThanOrEqual(12);
    }
  });

  it("los tres datos rápidos salen de los datos científicos, sin inventar cifras", () => {
    expect(quickFacts(BODIES.sol).map((f) => f.value)).toEqual(["109 Tierras", "5.499 °C", "8 minutos"]);
    expect(quickFacts(BODIES.mercurio).map((f) => f.value)).toEqual(["38 %", "88 días", "Sin lunas"]);
    expect(quickFacts(BODIES.tierra).map((f) => f.value)).toEqual(["12.756 km", "365 días", "1 luna"]);
    expect(quickFacts(BODIES.jupiter).map((f) => f.value)).toEqual(["11,2 Tierras", "11,9 años", "115 lunas"]);
    expect(quickFacts(BODIES.saturno).map((f) => f.value)).toEqual(["9,4 Tierras", "29 años", "293 lunas"]);
    for (const id of BODY_ORDER) expect(quickFacts(BODIES[id])).toHaveLength(3);
  });
});

describe("lectura de códigos QR con el escáner", () => {
  const ids = BODY_ORDER;

  it("acepta las paradas del recorrido, de cualquier dominio", () => {
    expect(stationPathFromQr("https://sistemasolar-black.vercel.app/estacion/sol", ids)).toBe("/estacion/sol");
    expect(stationPathFromQr("http://192.168.1.34:3000/estacion/jupiter/", ids)).toBe("/estacion/jupiter");
    expect(stationPathFromQr("  https://otro.cl/estacion/marte/mapa  ", ids)).toBe("/estacion/marte/mapa");
    expect(stationPathFromQr("/estacion/urano", ids)).toBe("/estacion/urano");
  });

  it("conserva el pedido de realidad aumentada y descarta otros parámetros", () => {
    expect(stationPathFromQr("https://x.cl/estacion/tierra?ar=1", ids)).toBe("/estacion/tierra?ar=1");
    expect(stationPathFromQr("https://x.cl/estacion/tierra?ar=1&next=//malo.cl", ids)).toBe("/estacion/tierra?ar=1");
    expect(stationPathFromQr("https://x.cl/estacion/tierra?utm=1", ids)).toBe("/estacion/tierra");
  });

  it("rechaza códigos ajenos: nunca saca a nadie del sitio", () => {
    for (const text of [
      "",
      "hola",
      "https://malo.cl/",
      "https://malo.cl/estacion/pluton",
      "https://malo.cl/otra/estacion/sol",
      "https://malo.cl/estacion/sol/../../admin",
      "https://malo.cl/estacion/sol/extra",
      "javascript:alert(1)",
      "WIFI:S:red;T:WPA;P:clave;;",
    ])
      expect(stationPathFromQr(text, ids), text).toBeNull();
  });
});
