"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BODIES, type Body, type SurfaceLabel } from "@/data/bodies";
import { subsolarPoint } from "@/lib/astro";
import { createGlowTexture, createSunMaterial } from "./sunMaterial";
import {
  Anchor,
  LabelLayer,
  LabelProjector,
  createLabelRegistry,
  type LabelRegistry,
  type LabelSpec,
} from "@/components/three/labels";
import { useTextures, type TextureRequest, type TextureStatus } from "./useTextures";
import { maxDpr, type Quality } from "./quality";

const DEG = Math.PI / 180;
/** Dirección (fija) desde la que llega la luz del Sol en la escena: horizontal, desde la izquierda. */
const LIGHT_DIR = new THREE.Vector3(-0.8, 0, 0.6).normalize();
const NUBLE = { lat: -36.42, lon: -71.96 };
/**
 * Giro de la escena alrededor del eje vertical para que la inclinación del eje
 * tenga una componente hacia el observador: así los anillos de Saturno y Urano
 * se ven abiertos y no de canto.
 */
const VIEW_YAW = -0.65;
const MOON_DIAMETER_KM = 3474.8;

/** Punto de la superficie (radio 1) en el sistema de la textura equirectangular de three.js. */
export function surfacePoint(lat: number, lon: number, polarRatio = 1): THREE.Vector3 {
  const φ = lat * DEG;
  const λ = lon * DEG;
  return new THREE.Vector3(Math.cos(φ) * Math.cos(λ), Math.sin(φ) * polarRatio, -Math.cos(φ) * Math.sin(λ));
}

export interface EarthNow {
  day: boolean;
  sunElevationDeg: number;
}

export interface PlanetCanvasProps {
  body: Body;
  quality: Quality;
  autoRotate: boolean;
  showLabels: boolean;
  compare: boolean;
  special: boolean;
  reducedMotion: boolean;
  zoomSeq: number;
  zoomDir: 1 | -1;
  resetSeq: number;
  /** Se incrementa para volar hacia el objetivo de la acción especial. */
  focusSeq: number;
  /** Giro de cámara con teclado: grados de azimut y de elevación. */
  nudge: { seq: number; azimuth: number; polar: number };
  onTextureStatus: (status: TextureStatus) => void;
  onEarthNow?: (info: EarthNow) => void;
}

/** Inclinación visual del eje y sentido de giro (ver comentario en PlanetModel). */
function axisGeometry(body: Body): { tiltDeg: number; spinSign: 1 | -1 } {
  const ob = body.obliquityDeg;
  if (ob > 90) return { tiltDeg: 180 - ob, spinSign: -1 };
  return { tiltDeg: ob, spinSign: body.render.retrograde ? -1 : 1 };
}

function ringGeometry(inner: number, outer: number, segments = 180): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(inner, outer, segments, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }
  return g;
}

function planetRadiusKm(body: Body): number {
  return body.diameterKm / 2;
}

/** Extensión (en radios del planeta) que debe caber en pantalla. */
function sceneExtent(body: Body): number {
  const rings = body.render.rings;
  return rings ? rings.outerKm / planetRadiusKm(body) : 1;
}

// ---------------------------------------------------------------------------
// Sol
// ---------------------------------------------------------------------------

function SunModel({ reducedMotion, spin }: { reducedMotion: boolean; spin: boolean }) {
  const material = useMemo(() => createSunMaterial(), []);
  const glow = useMemo(() => createGlowTexture(), []);
  const mesh = useRef<THREE.Mesh>(null);
  useEffect(
    () => () => {
      material.dispose();
      glow.dispose();
    },
    [material, glow],
  );
  useFrame((_, dt) => {
    if (!reducedMotion) material.uniforms.uTime!.value += dt;
    if (spin && mesh.current) mesh.current.rotation.y += dt * ((2 * Math.PI) / BODIES.sol.render.spinSeconds);
  });
  return (
    <group rotation-z={-BODIES.sol.obliquityDeg * DEG}>
      <mesh ref={mesh} material={material}>
        <sphereGeometry args={[1, 96, 64]} />
      </mesh>
      <sprite scale={[3.4, 3.4, 1]}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
      </sprite>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Planetas
// ---------------------------------------------------------------------------

interface PlanetModelProps {
  body: Body;
  quality: Quality;
  spinning: boolean;
  showLabels: boolean;
  special: boolean;
  reducedMotion: boolean;
  onTextureStatus: (s: TextureStatus) => void;
  spinRef: MutableRefObject<THREE.Group | null>;
  orientRef: MutableRefObject<THREE.Group | null>;
  registry: RefObject<LabelRegistry>;
  labelsOn: boolean;
}

// ---------------------------------------------------------------------------
// Halo atmosférico (brillo en el borde, más fuerte en el lado iluminado)
// ---------------------------------------------------------------------------

/** Color y fuerza del halo de cada cuerpo. Mercurio no tiene atmósfera apreciable. */
const ATMOSPHERE: Partial<Record<string, { color: string; strength: number }>> = {
  tierra: { color: "#5b9dff", strength: 1.72 },
  venus: { color: "#ffd685", strength: 1.42 },
  marte: { color: "#ff9a74", strength: 0.60 },
  jupiter: { color: "#ffcf9e", strength: 0.75 },
  saturno: { color: "#f3dca6", strength: 0.68 },
  urano: { color: "#8fe8ee", strength: 1.35 },
};

function Atmosphere({ bodyId, polar }: { bodyId: string; polar: number }) {
  const spec = ATMOSPHERE[bodyId];
  const material = useMemo(() => {
    if (!spec) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(spec.color) },
        uStrength: { value: spec.strength },
        uLight: { value: LIGHT_DIR.clone() },
      },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vW;
        void main() {
          vN = normalize(normalMatrix * normal);
          vW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uStrength;
        uniform vec3 uLight;
        varying vec3 vN;
        varying vec3 vW;
        void main() {
          // Cara trasera de la cápsula: 0 en su borde exterior, ~0,5 donde toca el planeta.
          float facing = -dot(vN, vec3(0.0, 0.0, 1.0));
          float rim = pow(clamp(facing / 0.58, 0.0, 1.0), 1.7);
          float lit = smoothstep(-0.35, 0.55, dot(normalize(vW), uLight));
          float a = rim * mix(0.18, 1.0, lit) * uStrength;
          gl_FragColor = vec4(uColor * a, a);
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
  }, [spec]);
  useEffect(() => () => material?.dispose(), [material]);
  if (!material) return null;
  return (
    <mesh scale={[1.22, 1.22 * polar, 1.22]} material={material}>
      <sphereGeometry args={[1, 64, 48]} />
    </mesh>
  );
}

function PlanetModel({
  body,
  quality,
  spinning,
  showLabels,
  special,
  reducedMotion,
  onTextureStatus,
  spinRef,
  orientRef,
  registry,
  labelsOn,
}: PlanetModelProps) {
  const r = body.render;
  const isEarth = body.id === "tierra";
  const { tiltDeg, spinSign } = axisGeometry(body);

  const requests = useMemo(() => {
    const list: TextureRequest[] = [];
    if (r.texture) list.push({ url: quality === "alta" ? r.texture.high : r.texture.low, color: true });
    if (r.bump) list.push({ url: r.bump, color: false });
    if (r.clouds) list.push({ url: r.clouds.texture, color: true });
    if (r.cloudCover) list.push({ url: r.cloudCover, color: true });
    if (r.rings) list.push({ url: r.rings.texture, color: true });
    return list;
  }, [r, quality]);

  const { textures, status } = useTextures(requests);
  useEffect(() => onTextureStatus(status), [status, onTextureStatus]);

  let idx = 0;
  const mapTex = r.texture ? (textures[idx++] ?? null) : null;
  const bumpTex = r.bump ? (textures[idx++] ?? null) : null;
  const cloudTex = r.clouds ? (textures[idx++] ?? null) : null;
  const coverTex = r.cloudCover ? (textures[idx++] ?? null) : null;
  const ringTex = r.rings ? (textures[idx++] ?? null) : null;

  // Orientación de la Tierra para la hora actual (línea día/noche real).
  const earthQuat = useMemo(() => {
    if (!isEarth) return null;
    const s = subsolarPoint(new Date());
    const sE = surfacePoint(s.lat, s.lon);
    const Y = new THREE.Vector3(0, 1, 0);
    const ε = body.obliquityDeg * DEG;
    const cosφ = THREE.MathUtils.clamp(Math.sin(s.lat * DEG) / Math.sin(ε), -1, 1);
    const φ = Math.acos(cosφ);
    const P = new THREE.Vector3().crossVectors(Y, LIGHT_DIR).normalize();
    const h = LIGHT_DIR.clone()
      .multiplyScalar(Math.cos(φ))
      .add(P.multiplyScalar(Math.sin(φ)))
      .normalize();
    const N = Y.clone()
      .multiplyScalar(Math.cos(ε))
      .add(h.multiplyScalar(Math.sin(ε)))
      .normalize();
    const e1 = Y.clone();
    const e2 = sE
      .clone()
      .sub(e1.clone().multiplyScalar(sE.dot(e1)))
      .normalize();
    const e3 = new THREE.Vector3().crossVectors(e1, e2);
    const w1 = N.clone();
    const w2 = LIGHT_DIR.clone()
      .sub(w1.clone().multiplyScalar(LIGHT_DIR.dot(w1)))
      .normalize();
    const w3 = new THREE.Vector3().crossVectors(w1, w2);
    const ME = new THREE.Matrix4().makeBasis(e1, e2, e3);
    const MW = new THREE.Matrix4().makeBasis(w1, w2, w3);
    const Q = MW.multiply(ME.transpose());
    return new THREE.Quaternion().setFromRotationMatrix(Q);
  }, [isEarth, body.obliquityDeg]);

  const cloudsRef = useRef<THREE.Mesh>(null);
  const coverMat = useRef<THREE.MeshStandardMaterial>(null);

  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, dt) => {
    if (spinning && !reducedMotion && spinRef.current) {
      spinRef.current.rotation.y += dt * ((2 * Math.PI) / r.spinSeconds) * spinSign;
    }
    if (cloudsRef.current && spinning && !reducedMotion) cloudsRef.current.rotation.y += dt * 0.01;
    if (coverMat.current) {
      const target = special ? 0 : 1;
      const cur = coverMat.current.opacity;
      if (cur !== target) {
        const next = reducedMotion ? target : cur + (target - cur) * (1 - Math.exp(-dt * 3));
        coverMat.current.opacity = Math.abs(next - target) < 0.005 ? target : next;
        coverMat.current.visible = coverMat.current.opacity > 0.01;
        invalidate();
      }
    }
  });

  const polar = r.polarRatio;
  const surfaceLabels = r.labels.filter((l) => !l.ringKm);
  const ringLabels = r.labels.filter((l) => l.ringKm);
  const ringR = planetRadiusKm(body);
  const ringGeo = useMemo(
    () => (r.rings ? ringGeometry(r.rings.innerKm / ringR, r.rings.outerKm / ringR) : null),
    [r.rings, ringR],
  );
  useEffect(() => () => ringGeo?.dispose(), [ringGeo]);

  const showAxis = showLabels || (special && r.special.kind === "axis");
  const fallbackColor = new THREE.Color(body.color);

  return (
    <group rotation-y={earthQuat ? 0 : VIEW_YAW}>
      <group ref={orientRef} {...(earthQuat ? { quaternion: earthQuat } : { "rotation-z": -tiltDeg * DEG })}>
        <group ref={spinRef}>
          <mesh scale={[1, polar, 1]}>
            <sphereGeometry args={[1, 96, 64]} />
            <meshStandardMaterial
              key={mapTex ? "tex" : "plain"}
              map={mapTex}
              bumpMap={bumpTex}
              bumpScale={bumpTex ? 2.2 : 0}
              color={mapTex ? "#ffffff" : fallbackColor}
              roughness={0.95}
              metalness={0}
            />
          </mesh>
          <Atmosphere bodyId={body.id} polar={polar} />
          {r.clouds && cloudTex && (
            <mesh ref={cloudsRef} scale={[1.012, 1.012 * polar, 1.012]}>
              <sphereGeometry args={[1, 72, 48]} />
              <meshStandardMaterial
                map={cloudTex}
                transparent
                opacity={r.clouds.opacity}
                depthWrite={false}
                roughness={1}
              />
            </mesh>
          )}
          {r.cloudCover && (
            <mesh scale={[1.014, 1.014 * polar, 1.014]}>
              <sphereGeometry args={[1, 72, 48]} />
              <meshStandardMaterial
                key={coverTex ? "tex" : "plain"}
                ref={coverMat}
                map={coverTex}
                color={coverTex ? "#ffffff" : "#e6cf9a"}
                transparent
                opacity={1}
                roughness={1}
              />
            </mesh>
          )}
          {surfaceLabels.map((l: SurfaceLabel) => (
            <Anchor
              key={l.text}
              id={`s:${l.text}`}
              position={surfacePoint(l.lat, l.lon, polar).multiplyScalar(1.02)}
              active={labelsOn && (l.mode !== "radar" || special)}
              registry={registry}
            />
          ))}
        </group>

        {r.rings && ringGeo && (
          <mesh geometry={ringGeo} rotation-x={-Math.PI / 2}>
            <meshBasicMaterial
              key={ringTex ? "tex" : "plain"}
              map={ringTex}
              color={ringTex ? "#ffffff" : "#bfae8a"}
              transparent
              opacity={ringTex ? 1 : 0.35}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
        {ringLabels.map((l, i) => {
          // Repartidas alrededor del anillo para que sus etiquetas no se encimen en pantallas chicas.
          const angle = (52 + i * 42) * DEG;
          const rr = (l.ringKm ?? 0) / ringR;
          return (
            <Anchor
              key={l.text}
              id={`r:${l.text}`}
              position={new THREE.Vector3(Math.cos(angle) * rr, 0.02, Math.sin(angle) * rr)}
              active={labelsOn}
              facing={false}
              registry={registry}
            />
          );
        })}

        {showAxis && (
          <Line
            points={[
              [0, -1.75, 0],
              [0, 1.75, 0],
            ]}
            color={special && r.special.kind === "axis" ? "#f4b860" : "#eef2f7"}
            lineWidth={special && r.special.kind === "axis" ? 2.5 : 1.5}
            dashed
            dashSize={0.08}
            gapSize={0.06}
            transparent
            opacity={0.85}
          />
        )}
        <Anchor id="axis" position={[0, 1.85, 0]} active={showAxis} facing={false} registry={registry} />
      </group>
    </group>
  );
}

/** Plano de la órbita y ángulo del eje (para la acción «eje inclinado»). */
function OrbitPlane({ body, visible, registry }: { body: Body; visible: boolean; registry: RefObject<LabelRegistry> }) {
  const extent = sceneExtent(body);
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push([Math.cos(a) * extent * 1.25, 0, Math.sin(a) * extent * 1.25]);
    }
    return pts;
  }, [extent]);
  return (
    <group visible={visible}>
      <Line
        points={points}
        color="#a7b2c9"
        lineWidth={1}
        dashed
        dashSize={0.1}
        gapSize={0.08}
        transparent
        opacity={0.6}
      />
      <Line
        points={[
          [-extent * 1.6, 0, 0],
          [extent * 1.6, 0, 0],
        ]}
        color="#a7b2c9"
        lineWidth={1}
        transparent
        opacity={0.5}
      />
      <Anchor
        id="orbit"
        position={new THREE.Vector3(extent * 1.45, 0, 0)}
        active={visible}
        facing={false}
        registry={registry}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Comparación de tamaño (Tierra, o Luna en la estación Tierra)
// ---------------------------------------------------------------------------

function comparisonSpec(body: Body): { label: string; radius: number; texture: string } {
  if (body.id === "tierra") {
    return { label: "Luna (a escala)", radius: MOON_DIAMETER_KM / body.diameterKm, texture: "/textures/moon_1k.webp" };
  }
  return {
    label: "Tierra (a escala)",
    radius: BODIES.tierra.diameterKm / body.diameterKm,
    texture: "/textures/earth_1k.webp",
  };
}

function comparisonOffset(body: Body): number {
  const { radius } = comparisonSpec(body);
  const extent = sceneExtent(body);
  return extent + Math.max(0.18, radius * 0.35) + radius;
}

function ComparisonBody({
  body,
  visible,
  registry,
}: {
  body: Body;
  visible: boolean;
  registry: RefObject<LabelRegistry>;
}) {
  const spec = comparisonSpec(body);
  // La textura se descarga solo cuando se activa la comparación.
  const requests = useMemo(() => (visible ? [{ url: spec.texture, color: true }] : []), [visible, spec.texture]);
  const { textures } = useTextures(requests);
  const x = comparisonOffset(body);
  return (
    <group position={[x, 0, 0]} visible={visible}>
      <mesh scale={spec.radius}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial
          key={textures[0] ? "tex" : "plain"}
          map={textures[0] ?? null}
          color={textures[0] ? "#ffffff" : "#8a94a8"}
          roughness={1}
        />
      </mesh>
      <Anchor
        id="cmp"
        position={new THREE.Vector3(0, spec.radius + 0.04, 0)}
        active={visible}
        facing={false}
        registry={registry}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Estrellas de fondo (procedurales, sin descargas)
// ---------------------------------------------------------------------------

function Starfield() {
  const geometry = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1;
      const t = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 60;
      pos[i * 3] = s * Math.cos(t) * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = s * Math.sin(t) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.16} color="#c9d3ea" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Cámara
// ---------------------------------------------------------------------------

function fitDistance(camera: THREE.PerspectiveCamera, width: number, height: number, margin = 1.3): number {
  const vFov = camera.fov * DEG;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  return Math.max(width / 2 / Math.tan(hFov / 2), height / 2 / Math.tan(vFov / 2)) * margin;
}

interface RigProps {
  body: Body;
  compare: boolean;
  special: boolean;
  zoomSeq: number;
  zoomDir: 1 | -1;
  resetSeq: number;
  focusSeq: number;
  nudge: { seq: number; azimuth: number; polar: number };
  controls: MutableRefObject<OrbitControlsImpl | null>;
  spinRef: MutableRefObject<THREE.Group | null>;
}

function CameraRig({
  body,
  compare,
  special,
  zoomSeq,
  zoomDir,
  resetSeq,
  focusSeq,
  nudge,
  controls,
  spinRef,
}: RigProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const homeView = useMemo(() => {
    void size;
    const extent = sceneExtent(body);
    let center = new THREE.Vector3(0, 0, 0);
    let width = extent * 2;
    let height = extent * 2;
    if (compare) {
      const spec = comparisonSpec(body);
      const right = comparisonOffset(body) + spec.radius;
      const left = -extent;
      center = new THREE.Vector3((left + right) / 2, 0, 0);
      width = right - left;
      height = Math.max(extent, spec.radius) * 2;
    }
    const dist = fitDistance(camera, width, height, body.render.rings ? 1.12 : 1.35);
    const dir = new THREE.Vector3(0, 0.22, 1).normalize();
    return { pos: center.clone().add(dir.multiplyScalar(dist)), target: center };
  }, [body, compare, camera, size]);

  // Vista inicial y al cambiar la comparación o el tamaño del lienzo.
  useEffect(() => {
    goal.current = { pos: homeView.pos.clone(), target: homeView.target.clone() };
    invalidate();
  }, [homeView, resetSeq, invalidate]);

  // Zoom con botones.
  useEffect(() => {
    if (zoomSeq === 0) return;
    const c = controls.current;
    const target = c ? c.target.clone() : new THREE.Vector3();
    const offset = camera.position.clone().sub(target);
    const factor = zoomDir > 0 ? 0.78 : 1.28;
    const extent = sceneExtent(body);
    const len = THREE.MathUtils.clamp(offset.length() * factor, extent * 1.25, extent * 14);
    goal.current = { pos: target.clone().add(offset.setLength(len)), target };
    invalidate();
  }, [zoomSeq, zoomDir, camera, controls, body, invalidate]);

  // Giro con el teclado (flechas), alternativa a los gestos.
  useEffect(() => {
    if (nudge.seq === 0) return;
    const c = controls.current;
    const target = c ? c.target.clone() : new THREE.Vector3();
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    sph.theta += nudge.azimuth * DEG;
    sph.phi = THREE.MathUtils.clamp(sph.phi + nudge.polar * DEG, 0.15, Math.PI - 0.15);
    goal.current = { pos: target.clone().add(new THREE.Vector3().setFromSpherical(sph)), target };
    invalidate();
  }, [nudge, camera, controls, invalidate]);

  // Vuelo hacia el objetivo de la acción especial.
  useEffect(() => {
    if (focusSeq === 0 || !special) return;
    const kind = body.render.special.kind;
    const extent = sceneExtent(body);
    if (kind === "rings") {
      const dist = fitDistance(camera, extent * 2, extent * 2, 1.0);
      goal.current = {
        pos: new THREE.Vector3(0.6, 0.9, 1).normalize().multiplyScalar(dist),
        target: new THREE.Vector3(),
      };
    } else if (kind === "axis") {
      const dist = fitDistance(camera, extent * 3.4, extent * 2.4, 1.05);
      goal.current = {
        pos: new THREE.Vector3(0, 0.12, 1).normalize().multiplyScalar(dist),
        target: new THREE.Vector3(),
      };
    } else if (kind === "focus-label" || kind === "daynight") {
      const sp = body.render.special;
      const label = sp.kind === "focus-label" ? body.render.labels.find((l) => l.text === sp.target) : NUBLE;
      if (kind === "daynight" && spinRef.current) spinRef.current.rotation.y = 0; // volver a la orientación de «ahora»
      if (label && spinRef.current) {
        spinRef.current.updateWorldMatrix(true, false);
        const local = surfacePoint(label.lat, label.lon, body.render.polarRatio);
        const world = local.applyMatrix4(spinRef.current.matrixWorld);
        const dist = fitDistance(camera, 2, 2, 1.25);
        goal.current = { pos: world.normalize().multiplyScalar(dist), target: new THREE.Vector3() };
      }
    }
    invalidate();
  }, [focusSeq, special, body, camera, spinRef, invalidate]);

  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 4.5);
    camera.position.lerp(g.pos, k);
    if (c) {
      c.target.lerp(g.target, k);
      c.update();
    }
    if (camera.position.distanceTo(g.pos) < 0.002) {
      camera.position.copy(g.pos);
      if (c) c.target.copy(g.target);
      goal.current = null;
    }
    invalidate();
  });

  return null;
}

/** Al apartar la vista o cambiar de pestaña, se detiene el renderizado. */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

/** Notifica si en Ñuble es de día o de noche ahora mismo. */
function useEarthNow(body: Body, onEarthNow?: (i: EarthNow) => void) {
  useEffect(() => {
    if (body.id !== "tierra" || !onEarthNow) return;
    const s = subsolarPoint(new Date());
    const elevation =
      Math.asin(THREE.MathUtils.clamp(surfacePoint(NUBLE.lat, NUBLE.lon).dot(surfacePoint(s.lat, s.lon)), -1, 1)) / DEG;
    onEarthNow({ day: elevation > -0.833, sunElevationDeg: elevation });
  }, [body.id, onEarthNow]);
}

function SceneContent(
  props: PlanetCanvasProps & {
    controls: MutableRefObject<OrbitControlsImpl | null>;
    registry: RefObject<LabelRegistry>;
  },
) {
  const {
    body,
    quality,
    autoRotate,
    showLabels,
    compare,
    special,
    reducedMotion,
    onTextureStatus,
    onEarthNow,
    registry,
  } = props;
  const spinRef = useRef<THREE.Group | null>(null);
  const orientRef = useRef<THREE.Group | null>(null);
  useEarthNow(body, onEarthNow);

  const kind = body.render.special.kind;
  const labelsOn = labelsActive(body, showLabels, special);
  const isSun = body.id === "sol";
  const showCompare = compare || (special && kind === "compare-earth");

  // En modo «a demanda», redibujar cuando cambian las opciones visibles.
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [labelsOn, showCompare, special, invalidate]);
  useEffect(() => {
    if (isSun) onTextureStatus("lista");
  }, [isSun, onTextureStatus]);

  return (
    <>
      <Starfield />
      {!isSun && <ambientLight intensity={body.id === "tierra" ? 0.13 : 0.26} />}
      {!isSun && body.id !== "tierra" && <hemisphereLight args={["#9db8ff", "#2a1a28", 0.32]} />}
      {!isSun && <directionalLight position={LIGHT_DIR.clone().multiplyScalar(10)} intensity={2.6} />}
      {isSun && <ambientLight intensity={0.25} />}
      {isSun && <directionalLight position={[-6, 0, 2]} intensity={2} />}
      {isSun ? (
        <>
          <SunModel reducedMotion={reducedMotion} spin={autoRotate} />
          {BODIES.sol.render.labels.map((l) => (
            <Anchor
              key={l.text}
              id={`s:${l.text}`}
              position={surfacePoint(l.lat, l.lon).multiplyScalar(1.02)}
              active={labelsOn}
              registry={registry}
            />
          ))}
        </>
      ) : (
        <PlanetModel
          body={body}
          quality={quality}
          spinning={autoRotate}
          showLabels={showLabels}
          special={special}
          reducedMotion={reducedMotion}
          onTextureStatus={onTextureStatus}
          spinRef={spinRef}
          orientRef={orientRef}
          registry={registry}
          labelsOn={labelsOn}
        />
      )}
      {kind === "axis" && <OrbitPlane body={body} visible={special} registry={registry} />}
      <ComparisonBody body={body} visible={showCompare} registry={registry} />
      <LabelProjector registry={registry} />
      <CameraRig
        body={body}
        compare={showCompare}
        special={special}
        zoomSeq={props.zoomSeq}
        zoomDir={props.zoomDir}
        resetSeq={props.resetSeq}
        focusSeq={props.focusSeq}
        nudge={props.nudge}
        controls={props.controls}
        spinRef={spinRef}
      />
    </>
  );
}

/** Las etiquetas de superficie se muestran con el botón «Etiquetas» o con algunas acciones especiales. */
function labelsActive(body: Body, showLabels: boolean, special: boolean): boolean {
  const kind = body.render.special.kind;
  return (
    showLabels || (special && (kind === "rings" || kind === "focus-label" || kind === "radar" || kind === "daynight"))
  );
}

/** Lista de todas las etiquetas posibles de la escena (se montan una vez). */
function labelSpecs(body: Body): LabelSpec[] {
  const list: LabelSpec[] = body.render.labels.map((l) => ({
    id: l.ringKm ? `r:${l.text}` : `s:${l.text}`,
    text: l.text,
  }));
  list.push({ id: "cmp", text: comparisonSpec(body).label, accent: true });
  if (body.id !== "sol") list.push({ id: "axis", text: "Eje de rotación" });
  if (body.render.special.kind === "axis") {
    list.push({ id: "orbit", text: `Plano de la órbita. Eje inclinado ${body.obliquityDeg.toLocaleString("es-CL")}°` });
  }
  return list;
}

export default function PlanetCanvas(props: PlanetCanvasProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const registry = useRef<LabelRegistry>(createLabelRegistry());
  const visible = usePageVisible();
  const { body, autoRotate, reducedMotion, quality } = props;
  const animating = (autoRotate && !reducedMotion) || (body.id === "sol" && !reducedMotion);
  const extent = sceneExtent(body);
  const labels = useMemo(() => labelSpecs(body), [body]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas
        dpr={[1, maxDpr(quality)]}
        frameloop={!visible ? "never" : animating ? "always" : "demand"}
        camera={{ fov: 38, near: 0.05, far: 200, position: [0, 0.6, 4] }}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <SceneContent {...props} controls={controls} registry={registry} />
        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          zoomSpeed={0.7}
          minDistance={extent * 1.25}
          maxDistance={extent * 14}
        />
      </Canvas>
      <LabelLayer labels={labels} registry={registry} />
    </div>
  );
}
