#!/usr/bin/env node
/**
 * Vuelve a obtener el trazado de la ruta San Carlos – San Fabián de Alico
 * desde el servidor público de OSRM (datos de OpenStreetMap) y actualiza
 * src/data/route/ruta-san-carlos-san-fabian.json.
 *
 *   npm run route:fetch
 *
 * Requiere conexión a internet. El servidor de demostración de OSRM tiene una
 * política de uso justo: ejecuta este script solo cuando haga falta.
 * Los extremos (plazas de armas) se pueden cambiar con --desde y --hasta:
 *   node scripts/route/fetch-route.mjs --desde -36.4248501,-71.9581139 --hasta -36.5565991,-71.5498316
 */
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const [fromLat, fromLng] = arg("desde", "-36.4248501,-71.9581139").split(",").map(Number);
const [toLat, toLng] = arg("hasta", "-36.5565991,-71.5498316").split(",").map(Number);
const TOLERANCE_M = 6;
const R = 6371008.8;

function hav(a, b) {
  const t = Math.PI / 180;
  const dLat = (b[1] - a[1]) * t;
  const dLng = (b[0] - a[0]) * t;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Douglas-Peucker en proyección local (m). */
function simplify(coords, eps) {
  const lat0 = (coords[0][1] * Math.PI) / 180;
  const P = coords.map(([lng, lat]) => [((lng * Math.PI) / 180) * R * Math.cos(lat0), ((lat * Math.PI) / 180) * R]);
  const keep = new Array(P.length).fill(false);
  keep[0] = keep[P.length - 1] = true;
  const stack = [[0, P.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0;
    let idx = -1;
    const [ax, ay] = P[a];
    const [bx, by] = P[b];
    const dx = bx - ax;
    const dy = by - ay;
    const L2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = P[i];
      let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > eps) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  return coords.filter((_, i) => keep[i]).map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]);
}

const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
console.log("Consultando OSRM…");
const res = await fetch(url, { headers: { "User-Agent": "sistema-solar-nuble/1.0 (divulgacion cientifica)" } });
if (!res.ok) {
  console.error(`OSRM respondió ${res.status}`);
  process.exit(1);
}
const data = await res.json();
const route = data.routes?.[0];
if (!route) {
  console.error("OSRM no devolvió una ruta.");
  process.exit(1);
}
const full = route.geometry.coordinates;
let fullLen = 0;
for (let i = 1; i < full.length; i++) fullLen += hav(full[i - 1], full[i]);
let n31 = 0;
for (const leg of route.legs) for (const s of leg.steps) if ((s.ref || "").includes("N-31")) n31 += s.distance;
const simp = simplify(full, TOLERANCE_M);
let simpLen = 0;
for (let i = 1; i < simp.length; i++) simpLen += hav(simp[i - 1], simp[i]);
const txt = simp.map(([a, b]) => `${Math.round(a * 1e5)},${Math.round(b * 1e5)}`).join(";");

const feature = {
  type: "Feature",
  properties: {
    nombre: "Ruta San Carlos – San Fabián de Alico (vía Ruta N-31)",
    origen: { nombre: "Plaza de Armas de San Carlos", lat: fromLat, lng: fromLng, fuente: "Nominatim / OpenStreetMap" },
    destino: { nombre: "Plaza de Armas de San Fabián de Alico", lat: toLat, lng: toLng, fuente: "Nominatim / OpenStreetMap" },
    fuente: "OSRM (router.project-osrm.org) sobre datos de OpenStreetMap",
    licencia: "© colaboradores de OpenStreetMap, ODbL 1.0",
    obtenido: new Date().toISOString().slice(0, 10),
    perfil: "driving",
    simplificacion: `Douglas-Peucker, tolerancia ${TOLERANCE_M} m; coordenadas redondeadas a 5 decimales (~1 m)`,
    largoCompletoOSRMm: Math.round(fullLen),
    largoSimplificadoM: Math.round(simpLen),
    tramoN31m: Math.round(n31),
    sha256Coordenadas: createHash("sha256").update(txt).digest("hex"),
  },
  geometry: { type: "LineString", coordinates: simp },
};
await writeFile("src/data/route/ruta-san-carlos-san-fabian.json", JSON.stringify(feature, null, 1));
console.log(`Listo: ${simp.length} puntos, ${(simpLen / 1000).toFixed(2)} km (${(n31 / 1000).toFixed(1)} km por la N-31).`);
console.log("Revisa el resultado en el mapa (npm run dev → /mapa) y ejecuta npm test.");
