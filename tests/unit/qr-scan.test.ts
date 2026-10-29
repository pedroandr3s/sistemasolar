import { describe, expect, it } from "vitest";
import { stationIdFromQrText } from "@/lib/qrScan";
import { STATIONS } from "@/config/stations";

const IDS = STATIONS.map((s) => s.id);

describe("lectura de QR: estación a la que apunta el código", () => {
  it("reconoce la estación sin importar el dominio (producción, IP local o túnel)", () => {
    for (const base of [
      "https://sistemasolar.cl",
      "http://192.168.1.50:3000",
      "https://x.trycloudflare.com",
      "http://localhost:3000",
    ]) {
      for (const id of IDS) expect(stationIdFromQrText(`${base}/estacion/${id}`, IDS)).toBe(id);
    }
  });

  it("acepta rutas relativas, barra final y espacios", () => {
    expect(stationIdFromQrText("/estacion/tierra", IDS)).toBe("tierra");
    expect(stationIdFromQrText("  https://a.cl/estacion/saturno/  ", IDS)).toBe("saturno");
  });

  it("ignora los parámetros de la URL", () => {
    expect(stationIdFromQrText("https://a.cl/estacion/urano?utm=1#x", IDS)).toBe("urano");
  });

  it("rechaza estaciones inexistentes, otras rutas, subrutas y texto libre", () => {
    for (const bad of [
      "https://a.cl/estacion/pluton",
      "https://a.cl/estacion/marte/mapa",
      "https://a.cl/otra/marte",
      "https://a.cl/",
      "marte",
      "",
      "javascript:alert(1)",
      "https://a.cl/estacion/../admin",
      "x".repeat(3000),
    ]) {
      expect(stationIdFromQrText(bad, IDS), bad.slice(0, 40)).toBeNull();
    }
  });
});
