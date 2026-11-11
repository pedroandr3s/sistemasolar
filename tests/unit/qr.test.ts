import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeQrFile, generateQrSet } from "../../scripts/qr/lib";
import { STATIONS } from "@/config/stations";

describe("generador de códigos QR", () => {
  it("no genera QR de producción sin una URL válida", async () => {
    const out = mkdtempSync(join(tmpdir(), "qr-"));
    for (const bad of [
      undefined,
      "",
      "https://example.com",
      "http://192.168.1.4:3000",
      "https://x.trycloudflare.com",
    ]) {
      const r = await generateQrSet({ baseUrl: bad, mode: "produccion", outDir: out });
      expect(r.ok).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it("genera PNG, SVG, PDF y manifiesto, y cada QR decodifica la URL correcta", async () => {
    const out = mkdtempSync(join(tmpdir(), "qr-"));
    const base = "https://sistemasolar-prueba.cl";
    const r = await generateQrSet({
      baseUrl: base,
      mode: "produccion",
      outDir: out,
      now: new Date("2026-10-17T12:00:00Z"),
    });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.stations).toHaveLength(STATIONS.length);

    for (const s of r.stations) {
      expect(s.url).toBe(`${base}/estacion/${s.id}`);
      expect(await decodeQrFile(join(out, s.png))).toBe(s.url);
      const svg = readFileSync(join(out, s.svg), "utf8");
      expect(svg).toContain("<svg");
      expect(readFileSync(join(out, s.svgLabeled), "utf8")).toContain(s.name);
    }

    for (const f of ["qr-imprimible.pdf", "fichas-de-prueba.pdf"]) {
      const buf = readFileSync(join(out, f));
      expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(statSync(join(out, f)).size).toBeGreaterThan(20_000);
    }

    const manifest = JSON.parse(readFileSync(join(out, "manifiesto.json"), "utf8"));
    expect(manifest.urlBase).toBe(base);
    expect(manifest.estaciones.map((e: { id: string }) => e.id)).toEqual(
      [...STATIONS].sort((a, b) => a.order - b.order).map((s) => s.id),
    );
    const csvRaw = readFileSync(join(out, "manifiesto.csv"));
    // BOM UTF-8 para que Excel abra bien los acentos («Júpiter»).
    expect([...csvRaw.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = csvRaw
      .toString("utf8")
      .replace(/^\uFEFF/, "")
      .trim()
      .split(/\r?\n/);
    expect(csv).toHaveLength(STATIONS.length + 1);
    expect(csv.join("\n")).toContain("Júpiter");
    expect(existsSync(join(out, "LEEME.txt"))).toBe(true);
  });

  it("en desarrollo acepta una IP de red local con advertencia", async () => {
    const out = mkdtempSync(join(tmpdir(), "qr-"));
    const r = await generateQrSet({ baseUrl: "http://192.168.1.50:3000", mode: "desarrollo", outDir: out });
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(await decodeQrFile(join(out, r.stations[3]!.png))).toBe("http://192.168.1.50:3000/estacion/tierra");
  });
});
