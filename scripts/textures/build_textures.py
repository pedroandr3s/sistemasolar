#!/usr/bin/env python3
"""
Genera las texturas de los cuerpos celestes usadas por la app.

Fuentes (ver docs/FUENTES-Y-LICENCIAS.md):
  - NASA 3D Resources (https://github.com/nasa/NASA-3D-Resources), carpeta
    "Images and Textures": Tierra (A), Marte, Júpiter, Saturno, Venus, Luna y el
    mapa estelar Hipparcos. Material de NASA sin derechos de autor (ver pautas de uso
    de medios de NASA).
  - Natural Earth (dominio público) vía el paquete npm world-atlas 2.x
    (land-50m), solo para la máscara de tierra/océano.
  - Texturas procedurales (Mercurio, Urano, nubes de Venus y de la Tierra,
    anillos de Saturno y de Urano) generadas aquí. Los radios de los anillos
    provienen de las fichas de NASA NSSDC (Saturnian / Uranian Rings Fact Sheet).

Uso:
  python3 scripts/textures/build_textures.py \
      --nasa "/ruta/a/NASA-3D-Resources/Images and Textures" \
      --land /ruta/a/land50.geojson \
      --out public/textures

Requisitos: Python 3.10+, numpy, scipy, Pillow (con soporte WebP).
La generación es determinista (semillas fijas).
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

WEBP_Q = 82


# ---------------------------------------------------------------------------
# utilidades
# ---------------------------------------------------------------------------

def save_webp(arr: np.ndarray, path: Path, quality: int = WEBP_Q) -> None:
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    mode = "RGBA" if arr.ndim == 3 and arr.shape[2] == 4 else ("RGB" if arr.ndim == 3 else "L")
    img = Image.fromarray(arr, mode)
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"  -> {path} {img.size} {path.stat().st_size // 1024} KB")


def resize(arr: np.ndarray, w: int, h: int) -> np.ndarray:
    mode = "RGBA" if arr.shape[2] == 4 else "RGB"
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode)
    return np.asarray(img.resize((w, h), Image.LANCZOS)).astype(np.float64)


def lonlat_grid(w: int, h: int):
    lon = (np.arange(w) + 0.5) / w * 2 * math.pi - math.pi  # -pi..pi
    lat = math.pi / 2 - (np.arange(h) + 0.5) / h * math.pi  # +pi/2..-pi/2
    return np.meshgrid(lon, lat)


class Noise3D:
    """Ruido de valor 3D con interpolación suave (determinista)."""

    def __init__(self, seed: int, size: int = 256):
        rng = np.random.default_rng(seed)
        self.size = size
        self.table = rng.random((size, size, size)).astype(np.float32)

    def __call__(self, x, y, z):
        s = self.size
        xi = np.floor(x).astype(np.int64)
        yi = np.floor(y).astype(np.int64)
        zi = np.floor(z).astype(np.int64)
        xf, yf, zf = x - xi, y - yi, z - zi
        u = xf * xf * (3 - 2 * xf)
        v = yf * yf * (3 - 2 * yf)
        w = zf * zf * (3 - 2 * zf)
        t = self.table

        def g(dx, dy, dz):
            return t[(xi + dx) % s, (yi + dy) % s, (zi + dz) % s]

        c00 = g(0, 0, 0) * (1 - u) + g(1, 0, 0) * u
        c10 = g(0, 1, 0) * (1 - u) + g(1, 1, 0) * u
        c01 = g(0, 0, 1) * (1 - u) + g(1, 0, 1) * u
        c11 = g(0, 1, 1) * (1 - u) + g(1, 1, 1) * u
        c0 = c00 * (1 - v) + c10 * v
        c1 = c01 * (1 - v) + c11 * v
        return c0 * (1 - w) + c1 * w

    def fbm(self, x, y, z, octaves=5, lacunarity=2.0, gain=0.5):
        total = np.zeros_like(x, dtype=np.float64)
        amp, freq, norm = 1.0, 1.0, 0.0
        for i in range(octaves):
            total += amp * self(x * freq + i * 17.1, y * freq + i * 31.7, z * freq + i * 7.3)
            norm += amp
            amp *= gain
            freq *= lacunarity
        return total / norm


def sphere_xyz(lon, lat, scale=1.0, offset=64.0):
    """Coordenadas sobre la esfera: el ruido se repite sin costura en ±180°."""
    x = np.cos(lat) * np.cos(lon)
    y = np.cos(lat) * np.sin(lon)
    z = np.sin(lat)
    return x * scale + offset, y * scale + offset, z * scale + offset


# ---------------------------------------------------------------------------
# Tierra
# ---------------------------------------------------------------------------

def rasterize_land(geojson_path: Path, w: int, h: int, supersample: int = 2) -> np.ndarray:
    data = json.loads(geojson_path.read_text())
    W, H = w * supersample, h * supersample
    img = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(img)

    def unwrap(ring):
        # Los anillos que cruzan el antimeridiano (±180°) se "desenrollan" para que
        # sean continuos; luego se dibujan desplazados ±360° para cubrir ambos bordes.
        out, prev = [], None
        for lng, lat in ring:
            if prev is not None:
                while lng - prev > 180:
                    lng -= 360
                while lng - prev < -180:
                    lng += 360
            out.append((lng, lat))
            prev = lng
        return out

    def proj(ring, shift):
        return [((lng + shift + 180.0) / 360.0 * W, (90.0 - lat) / 180.0 * H) for lng, lat in ring]

    def draw_ring(ring, fill):
        u = unwrap(ring)
        lngs = [p[0] for p in u]
        # Antártida: el anillo recorre todo el globo; se cierra por el polo sur.
        if max(lngs) - min(lngs) > 350 and abs(u[0][0] - u[-1][0]) > 300:
            u = u + [(u[-1][0], -90.0), (u[0][0], -90.0)]
        for shift in (-360.0, 0.0, 360.0):
            draw.polygon(proj(u, shift), fill=fill)

    for feat in data["features"]:
        geom = feat["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        for poly in polys:
            outer, *holes = poly
            draw_ring(outer, 255)
            for hole in holes:
                draw_ring(hole, 0)
    img = img.resize((w, h), Image.LANCZOS)
    return np.asarray(img).astype(np.float64) / 255.0


def build_earth(nasa: Path, land: Path, out: Path) -> None:
    print("Tierra")
    W, H = 2048, 1024
    src = np.asarray(Image.open(nasa / "Earth (A)" / "Earth (A).jpg").convert("RGB")).astype(np.float64)
    src = resize(src, W, H)
    lum = (0.299 * src[..., 0] + 0.587 * src[..., 1] + 0.114 * src[..., 2]) / 255.0
    # Relieve: detalle de alta frecuencia del sombreado del mapa NASA.
    blur = ndimage.gaussian_filter(lum, 6)
    shade = np.clip(lum / np.maximum(blur, 1e-3), 0.7, 1.3)

    mask = rasterize_land(land, W, H)
    lon, lat = lonlat_grid(W, H)
    lond, latd = np.degrees(lon), np.degrees(lat)

    # Océano: azul profundo; las zonas someras (más claras en el mapa) se aclaran.
    deep = np.array([9, 34, 66], dtype=np.float64)
    shallow = np.array([26, 78, 118], dtype=np.float64)
    depth = np.clip((blur - 0.25) / 0.35, 0, 1) ** 1.4
    ocean = deep * (1 - depth[..., None]) + shallow * depth[..., None]
    ocean *= (shade ** 0.35)[..., None]

    # Tierra: colores del mapa de relieve de NASA, atenuados hacia tonos terrosos.
    gray = lum[..., None] * 255.0
    land_rgb = src * 0.5 + gray * 0.5  # menos saturación
    earthy = np.array([92, 98, 66], dtype=np.float64)
    land_rgb = land_rgb * 0.62 + earthy * 0.38
    land_rgb *= (shade ** 0.9)[..., None]

    # Hielo: Antártida, Groenlandia y tierras muy al norte.
    ice_zone = (latd < -62) | ((lond > -75) & (lond < -10) & (latd > 59.5)) | (latd > 79)
    ice = np.array([228, 235, 242], dtype=np.float64) * (shade ** 0.8)[..., None]
    land_rgb = np.where(ice_zone[..., None], ice, land_rgb)

    mask = np.where(latd < -85, 1.0, mask)  # cierre del casquete antártico en el polo
    m = mask[..., None]
    earth = ocean * (1 - m) + land_rgb * m
    save_webp(earth, out / "earth_2k.webp")
    save_webp(resize(earth, 1024, 512), out / "earth_1k.webp")

    # Nubes ilustrativas (no corresponden a ningún día real).
    print("Nubes de la Tierra (ilustrativas)")
    Wc, Hc = 1024, 512
    lon, lat = lonlat_grid(Wc, Hc)
    n = Noise3D(11)
    x, y, z = sphere_xyz(lon, lat, scale=3.2)
    warp1 = n.fbm(x * 0.7, y * 0.7, z * 0.7, octaves=4)
    warp2 = n.fbm(x * 0.7 + 5.2, y * 0.7 + 1.3, z * 0.7 + 3.1, octaves=4)
    # z con más frecuencia: nubes estiradas de este a oeste, como los sistemas reales.
    base = n.fbm(x + warp1 * 2.4, y + warp2 * 2.4, z * 2.4 + warp1 * 1.2, octaves=7)
    latd = np.degrees(lat)
    # Ajuste suave por latitud: algo más de nubes en el ecuador y en latitudes
    # medias (frentes), menos en los subtrópicos. Es solo ilustrativo.
    adj = (0.05 * np.exp(-(latd / 10.0) ** 2)
           + 0.07 * np.exp(-((np.abs(latd) - 55) / 15.0) ** 2)
           - 0.06 * np.exp(-((np.abs(latd) - 25) / 10.0) ** 2))
    c = np.clip((base + adj - 0.50) / 0.22, 0, 1) ** 1.5
    alpha = c * 215
    rgba = np.dstack([np.full_like(alpha, 250), np.full_like(alpha, 251), np.full_like(alpha, 253), alpha])
    save_webp(rgba, out / "earth_clouds_1k.webp", quality=72)


# ---------------------------------------------------------------------------
# Texturas NASA directas
# ---------------------------------------------------------------------------

def build_simple(nasa: Path, out: Path, folder: str, name: str, hi: bool) -> None:
    print(name)
    src = np.asarray(Image.open(nasa / folder / f"{folder}.jpg").convert("RGB")).astype(np.float64)
    if hi:
        save_webp(resize(src, 2048, 1024), out / f"{name}_2k.webp")
    save_webp(resize(src, 1024, 512), out / f"{name}_1k.webp")


def build_stars(nasa: Path, out: Path) -> None:
    print("Fondo estelar (Hipparcos)")
    src = np.asarray(Image.open(nasa / "Hipparcos Star Map" / "Hipparcos Star Map.jpg").convert("RGB")).astype(np.float64)
    for (w, h, suffix) in ((2048, 1024, "2k"), (1024, 512, "1k")):
        a = resize(src, w, h) / 255.0
        a = np.clip((a ** 0.7) * 2.0, 0, 1) * 255
        Image.fromarray(a.astype(np.uint8), "RGB").save(out / f"stars_{suffix}.jpg", "JPEG", quality=80, optimize=True)
        print(f"  -> {out / f'stars_{suffix}.jpg'}")


# ---------------------------------------------------------------------------
# Procedurales
# ---------------------------------------------------------------------------

def build_mercury(out: Path) -> None:
    print("Mercurio (procedural)")
    W, H = 2048, 1024
    lon, lat = lonlat_grid(W, H)
    n = Noise3D(7)
    x, y, z = sphere_xyz(lon, lat, scale=4.0)
    height = n.fbm(x, y, z, octaves=6) * 0.35
    albedo = 0.42 + (n.fbm(x * 0.5 + 9, y * 0.5, z * 0.5, octaves=4) - 0.5) * 0.25

    rng = np.random.default_rng(42)
    cosl = np.cos(lat)
    px = np.cos(lat) * np.cos(lon)
    py = np.cos(lat) * np.sin(lon)
    pz = np.sin(lat)
    n_craters = 900
    # Ley de potencias: muchos cráteres pequeños, pocos grandes.
    radii = 0.012 * (rng.pareto(1.6, n_craters) + 1.0)
    radii = np.clip(radii, 0.012, 0.22)
    for r in radii:
        c_lon = rng.uniform(-math.pi, math.pi)
        c_lat = math.asin(rng.uniform(-1, 1))
        cx, cy, cz = math.cos(c_lat) * math.cos(c_lon), math.cos(c_lat) * math.sin(c_lon), math.sin(c_lat)
        # Caja de búsqueda en píxeles (con margen para el borde y la eyecta).
        R = r * 2.2
        y0 = int(max(0, (math.pi / 2 - (c_lat + R)) / math.pi * H))
        y1 = int(min(H, (math.pi / 2 - (c_lat - R)) / math.pi * H) + 1)
        sub_cos = max(math.cos(min(abs(c_lat) + R, math.pi / 2 - 1e-3)), 0.02)
        dlon = min(R / sub_cos, math.pi)
        cols = (np.arange(W) + 0.5) / W * 2 * math.pi - math.pi
        diff = np.abs(((cols - c_lon + math.pi) % (2 * math.pi)) - math.pi)
        xs = np.where(diff <= dlon)[0]
        if xs.size == 0 or y1 <= y0:
            continue
        sl = (slice(y0, y1), xs)
        dot = np.clip(px[sl] * cx + py[sl] * cy + pz[sl] * cz, -1, 1)
        d = np.arccos(dot) / r  # distancia en radios del cráter
        bowl = np.where(d < 1.0, -(1 - d ** 2) * 0.6, 0.0)
        rim = 0.35 * np.exp(-((d - 1.0) / 0.18) ** 2)
        ejecta = np.where(d > 1.0, 0.12 * np.exp(-(d - 1.0) * 2.2), 0.0)
        depth_scale = min(1.0, r / 0.05)
        height[sl] += (bowl + rim + ejecta * 0.5) * depth_scale * 0.5
        albedo[sl] += np.where(d < 0.9, -0.04, 0.0) + ejecta * 0.25
    # Algunos cráteres jóvenes con rayos brillantes.
    for _ in range(6):
        c_lon = rng.uniform(-math.pi, math.pi)
        c_lat = math.asin(rng.uniform(-0.8, 0.8))
        cx, cy, cz = math.cos(c_lat) * math.cos(c_lon), math.cos(c_lat) * math.sin(c_lon), math.sin(c_lat)
        dot = np.clip(px * cx + py * cy + pz * cz, -1, 1)
        d = np.arccos(dot)
        # dirección angular alrededor del cráter para generar rayos
        ang = np.arctan2(py * cx - px * cy, pz - cz * dot)
        rays = (np.cos(ang * rng.integers(9, 15) + rng.uniform(0, 6)) * 0.5 + 0.5) ** 6
        albedo += rays * np.exp(-d / 0.18) * 0.22 + np.exp(-(d / 0.02) ** 2) * 0.25
    del cosl

    h = (height - height.min()) / (height.max() - height.min())
    # Sombreado suave desde el relieve para que se lea el cráter incluso sin luz rasante.
    gy, gx = np.gradient(h)
    relief = np.clip(1.0 + (gx - gy) * 18.0, 0.6, 1.4)
    a = np.clip(albedo * relief, 0.08, 0.95)
    base_col = np.array([168, 160, 150], dtype=np.float64)
    rgb = a[..., None] / 0.45 * base_col
    save_webp(rgb, out / "mercury_2k.webp")
    save_webp(resize(rgb, 1024, 512), out / "mercury_1k.webp")
    bump = np.dstack([h * 255] * 3)
    save_webp(resize(bump, 1024, 512), out / "mercury_bump_1k.webp", quality=80)


def build_venus_clouds(out: Path) -> None:
    print("Nubes de Venus (procedural)")
    W, H = 1024, 512
    lon, lat = lonlat_grid(W, H)
    n = Noise3D(23)
    # Nubes estiradas en dirección este-oeste (vientos zonales muy rápidos).
    x, y, z = sphere_xyz(lon, lat, scale=2.0)
    warp = n.fbm(x * 0.8, y * 0.8, z * 3.0, octaves=3)
    v = n.fbm(x * 0.7 + warp, y * 0.7 + warp, z * 6.0 + warp * 2.0, octaves=6)
    latd = np.degrees(lat)
    v = v * 0.75 + 0.25 * np.cos(np.radians(latd)) ** 0.5
    light = np.array([238, 222, 180], dtype=np.float64)
    dark = np.array([196, 160, 104], dtype=np.float64)
    t = np.clip((v - 0.35) / 0.4, 0, 1)
    rgb = dark * (1 - t[..., None]) + light * t[..., None]
    save_webp(rgb, out / "venus_clouds_1k.webp")


def build_uranus(out: Path) -> None:
    print("Urano (procedural)")
    W, H = 1024, 512
    lon, lat = lonlat_grid(W, H)
    n = Noise3D(31)
    x, y, z = sphere_xyz(lon, lat, scale=1.5)
    latd = np.degrees(lat)
    bands = 0.5 + 0.5 * np.sin(np.radians(latd) * 9.0 + n.fbm(x, y, z * 4, octaves=3) * 1.2)
    base = np.array([166, 214, 222], dtype=np.float64)
    var = (bands - 0.5) * 6.0 + (n.fbm(x * 2, y * 2, z * 8, octaves=4) - 0.5) * 6.0
    polar = np.clip((np.abs(latd) - 55) / 30, 0, 1) * 10.0  # casquete polar algo más claro
    rgb = base[None, None, :] + (var + polar)[..., None]
    save_webp(rgb, out / "uranus_1k.webp")


def build_saturn_rings(out: Path) -> None:
    """Perfil radial de los anillos principales (C, B, división de Cassini, A, F).

    Radios (km) de NASA NSSDC, Saturnian Rings Fact Sheet. La opacidad usa
    los rangos de profundidad óptica publicados; la estructura fina es ilustrativa.
    """
    print("Anillos de Saturno")
    R_IN, R_OUT = 74_000.0, 140_600.0
    N = 2048
    r = R_IN + (np.arange(N) + 0.5) / N * (R_OUT - R_IN)
    alpha = np.zeros(N)
    col = np.zeros((N, 3))
    rng = np.random.default_rng(5)
    fine = ndimage.gaussian_filter1d(rng.random(N), 2.0)
    fine = (fine - fine.min()) / (fine.max() - fine.min())

    def band(r0, r1, a0, a1, c):
        sel = (r >= r0) & (r < r1)
        t = (r[sel] - r0) / (r1 - r0)
        alpha[sel] = a0 + (a1 - a0) * t
        col[sel] = c

    band(74_658, 91_975, 0.18, 0.32, (150, 138, 120))   # anillo C (tenue)
    band(91_975, 117_507, 0.80, 0.95, (222, 205, 172))  # anillo B (el más denso)
    band(117_507, 122_340, 0.06, 0.06, (120, 110, 100))  # división de Cassini
    band(122_340, 136_780, 0.70, 0.62, (196, 184, 160))  # anillo A
    # Huecos de Encke (133.410 km, ~325 km de ancho) y Keeler (136.487 km)
    alpha[np.abs(r - 133_410) < 163] = 0.04
    alpha[np.abs(r - 136_487) < 40] = 0.15
    # Anillo F, angosto
    f = np.abs(r - 139_826) < 120
    alpha[f] = 0.45
    col[f] = (210, 200, 180)
    alpha = np.clip(alpha * (0.85 + 0.3 * fine), 0, 1)
    strip = np.dstack([col[:, 0], col[:, 1], col[:, 2], alpha * 255])[0]
    img = np.repeat(strip[None, :, :], 8, axis=0)
    save_webp(img, out / "saturn_rings.webp", quality=90)
    meta = {"innerKm": R_IN, "outerKm": R_OUT, "planetRadiusKm": 60_268}
    (out / "saturn_rings.json").write_text(json.dumps(meta))


def build_uranus_rings(out: Path) -> None:
    """Anillos estrechos de Urano (NASA NSSDC, Uranian Rings Fact Sheet).

    En la realidad son muy oscuros (albedo ~0,015). Aquí se realzan para que se
    puedan ver; la interfaz lo indica.
    """
    print("Anillos de Urano (realzados)")
    R_IN, R_OUT = 41_000.0, 52_000.0
    N = 2048
    r = R_IN + (np.arange(N) + 0.5) / N * (R_OUT - R_IN)
    rings = [  # radio km, ancho km (se usa un mínimo visible), opacidad relativa
        (41_837, 1.5, 0.3), (42_234, 2, 0.5), (42_571, 2, 0.3), (44_718, 7, 0.4),
        (45_661, 8, 0.3), (47_176, 1.6, 0.4), (47_627, 2.5, 0.3), (48_300, 5, 0.5),
        (50_024, 2, 0.15), (51_149, 58, 0.9),
    ]
    px_km = (R_OUT - R_IN) / N
    alpha = np.zeros(N)
    for rad, width, op in rings:
        half = max(width / 2, px_km * 1.2)
        alpha = np.maximum(alpha, op * np.exp(-((r - rad) / half) ** 2))
    alpha = np.clip(alpha * 0.85, 0, 1)
    c = np.array([150, 160, 168], dtype=np.float64)
    strip = np.dstack([np.full(N, c[0]), np.full(N, c[1]), np.full(N, c[2]), alpha * 255])[0]
    img = np.repeat(strip[None, :, :], 8, axis=0)
    save_webp(img, out / "uranus_rings.webp", quality=90)
    (out / "uranus_rings.json").write_text(json.dumps({"innerKm": R_IN, "outerKm": R_OUT, "planetRadiusKm": 25_559}))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nasa", required=True, type=Path)
    ap.add_argument("--land", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    build_earth(args.nasa, args.land, args.out)
    build_simple(args.nasa, args.out, "Mars", "mars", hi=True)
    build_simple(args.nasa, args.out, "Venus", "venus_surface", hi=False)
    build_simple(args.nasa, args.out, "Jupiter", "jupiter", hi=False)
    build_simple(args.nasa, args.out, "Saturn", "saturn", hi=False)
    build_simple(args.nasa, args.out, "Moon", "moon", hi=False)
    build_stars(args.nasa, args.out)
    build_mercury(args.out)
    build_venus_clouds(args.out)
    build_uranus(args.out)
    build_saturn_rings(args.out)
    build_uranus_rings(args.out)
    print("Listo.")


if __name__ == "__main__":
    main()
