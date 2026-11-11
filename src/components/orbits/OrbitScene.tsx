"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BODIES } from "@/data/bodies";
import {
  ORBIT_PLANETS,
  heliocentricEcliptic,
  orbitPath,
  scaleVector,
  toScene,
  type DistanceMode,
  type PlanetId,
} from "@/lib/astro";
import { createGlowTexture } from "@/components/planet/sunMaterial";
import { Anchor, LabelLayer, LabelProjector, createLabelRegistry, type LabelRegistry } from "@/components/three/labels";
import { maxDpr, type Quality } from "@/components/planet/quality";

export interface OrbitSceneProps {
  timeRef: MutableRefObject<number>;
  playing: boolean;
  /** Días simulados por segundo real (negativo = hacia atrás). */
  rate: number;
  distanceMode: DistanceMode;
  showOrbits: boolean;
  showLabels: boolean;
  selected: PlanetId | null;
  onSelect: (id: PlanetId) => void;
  onTick: (ms: number) => void;
  view: { seq: number; kind: "superior" | "oblicua" | "inicio" | "centrar" };
  quality: Quality;
  /** Fecha (ms) usada para dibujar las órbitas; basta con actualizarla cada año simulado. */
  epochMs: number;
}

const UNITS: Record<DistanceMode, number> = { comprimida: 2.2, real: 0.52 };

function visualRadius(id: PlanetId, mode: DistanceMode): number {
  const r = 0.09 * Math.pow(BODIES[id].diameterKm / 12_756, 0.35);
  return mode === "real" ? r * 0.55 : r;
}

function sunRadius(mode: DistanceMode) {
  return mode === "real" ? 0.09 : 0.34;
}

function scenePos(id: PlanetId, ms: number, mode: DistanceMode): THREE.Vector3 {
  const v = scaleVector(heliocentricEcliptic(id, new Date(ms)), mode, UNITS[mode]);
  return new THREE.Vector3(...toScene(v));
}

function useLoadedTexture(url: string | null): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader()
      .loadAsync(url)
      .then((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        loaded = t;
        if (!cancelled) setTex(t);
        else t.dispose();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [url]);
  return tex;
}

function Planet({
  id,
  mode,
  timeRef,
  selected,
  showLabels,
  onSelect,
  registry,
}: {
  id: PlanetId;
  mode: DistanceMode;
  timeRef: MutableRefObject<number>;
  selected: boolean;
  showLabels: boolean;
  onSelect: (id: PlanetId) => void;
  registry: RefObject<LabelRegistry>;
}) {
  const body = BODIES[id];
  const tex = useLoadedTexture(body.render.texture?.low ?? null);
  const group = useRef<THREE.Group>(null);
  const r = visualRadius(id, mode);
  const tilt = body.obliquityDeg > 90 ? 180 - body.obliquityDeg : body.obliquityDeg;

  useFrame(() => {
    if (group.current) group.current.position.copy(scenePos(id, timeRef.current, mode));
  });

  const ringTex = useLoadedTexture(body.render.rings?.texture ?? null);
  const ringGeo = useMemo(() => {
    const rings = body.render.rings;
    if (!rings) return null;
    const pr = body.diameterKm / 2;
    const inner = (rings.innerKm / pr) * r;
    const outer = (rings.outerKm / pr) * r;
    const g = new THREE.RingGeometry(inner, outer, 96, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    return g;
  }, [body, r]);
  useEffect(() => () => ringGeo?.dispose(), [ringGeo]);

  return (
    <group ref={group}>
      <group rotation-z={(-tilt * Math.PI) / 180}>
        <mesh
          scale={[r, r * body.render.polarRatio, r]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onSelect(id);
          }}
        >
          <sphereGeometry args={[1, 40, 28]} />
          <meshStandardMaterial key={tex ? "t" : "p"} map={tex} color={tex ? "#ffffff" : body.color} roughness={1} />
        </mesh>
        {ringGeo && (
          <mesh geometry={ringGeo} rotation-x={-Math.PI / 2}>
            <meshBasicMaterial
              key={ringTex ? "t" : "p"}
              map={ringTex}
              color={ringTex ? "#fff" : body.color}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
              opacity={ringTex ? 1 : 0.3}
            />
          </mesh>
        )}
      </group>
      {/* Área de toque más grande que el planeta, para seleccionarlo con el dedo. */}
      <mesh
        visible={false}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(id);
        }}
      >
        <sphereGeometry args={[Math.max(r * 2.2, 0.22), 12, 8]} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[r * 1.7, r * 1.7 + 0.025, 48]} />
          <meshBasicMaterial color="#f4b860" side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Prioridad de etiquetas si se tocan: el planeta elegido, luego la Tierra (referencia del visitante). */}
      <Anchor
        id={id}
        position={[0, r + 0.08, 0]}
        active={showLabels || selected}
        facing={false}
        priority={selected ? 10 : id === "tierra" ? 2 : 0}
        registry={registry}
      />
    </group>
  );
}

function OrbitLine({ id, mode, epochMs }: { id: PlanetId; mode: DistanceMode; epochMs: number }) {
  const points = useMemo(() => {
    return orbitPath(id, new Date(epochMs), id === "mercurio" ? 160 : 240).map((v) => {
      const s = scaleVector(v, mode, UNITS[mode]);
      return toScene(s);
    });
  }, [id, mode, epochMs]);
  return <Line points={points} color={BODIES[id].color} lineWidth={1.2} transparent opacity={0.55} />;
}

function Sun({ mode }: { mode: DistanceMode }) {
  const glow = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => glow.dispose(), [glow]);
  const r = sunRadius(mode);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[r, 48, 32]} />
        <meshBasicMaterial color="#ffc35c" />
      </mesh>
      <sprite scale={[r * 4.2, r * 4.2, 1]}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
      </sprite>
    </group>
  );
}

function StarSphere({ quality }: { quality: Quality }) {
  const tex = useLoadedTexture(quality === "alta" ? "/textures/stars_2k.jpg" : "/textures/stars_1k.jpg");
  // El mapa estelar está en coordenadas ecuatoriales: se inclina por la oblicuidad de la eclíptica.
  return (
    <mesh rotation-x={(23.44 * Math.PI) / 180}>
      <sphereGeometry args={[90, 48, 32]} />
      <meshBasicMaterial
        key={tex ? "t" : "p"}
        map={tex}
        color={tex ? "#9aa6c6" : "#0f1830"}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function Simulation({
  timeRef,
  playing,
  rate,
  onTick,
}: Pick<OrbitSceneProps, "timeRef" | "playing" | "rate" | "onTick">) {
  const last = useRef(0);
  useFrame((_, dt) => {
    if (!playing) return;
    timeRef.current += Math.min(dt, 0.1) * rate * 86_400_000;
    last.current += dt;
    if (last.current > 0.2) {
      last.current = 0;
      onTick(timeRef.current);
    }
  });
  return null;
}

function CameraControl({
  view,
  selected,
  mode,
  timeRef,
  controls,
}: {
  view: OrbitSceneProps["view"];
  selected: PlanetId | null;
  mode: DistanceMode;
  timeRef: MutableRefObject<number>;
  controls: MutableRefObject<OrbitControlsImpl | null>;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const follow = useRef<PlanetId | null>(null);
  // Radio de la órbita de Urano (~19,2 UA) en unidades de la escena.
  const extent = mode === "real" ? 19.2 * UNITS.real : Math.sqrt(19.2) * UNITS.comprimida;

  useEffect(() => {
    const d = extent * 2.1;
    if (view.kind === "superior") {
      follow.current = null;
      goal.current = { pos: new THREE.Vector3(0, d * 1.15, 0.001), target: new THREE.Vector3() };
    } else if (view.kind === "oblicua" || view.kind === "inicio") {
      follow.current = null;
      goal.current = { pos: new THREE.Vector3(0, d * 0.62, d * 0.95), target: new THREE.Vector3() };
    } else if (view.kind === "centrar" && selected) {
      follow.current = selected;
      const p = scenePos(selected, timeRef.current, mode);
      const r = visualRadius(selected, mode);
      const off = new THREE.Vector3(0.5, 0.45, 1).normalize().multiplyScalar(r * 14 + 0.6);
      goal.current = { pos: p.clone().add(off), target: p };
    }
    invalidate();
  }, [view, selected, mode, extent, timeRef, invalidate]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (follow.current && c && !goal.current) {
      // Seguir al planeta mientras avanza el tiempo.
      const p = scenePos(follow.current, timeRef.current, mode);
      const delta = p.clone().sub(c.target);
      camera.position.add(delta);
      c.target.copy(p);
      c.update();
    }
    const g = goal.current;
    if (!g) return;
    if (follow.current) g.target.copy(scenePos(follow.current, timeRef.current, mode));
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(g.pos, k);
    if (c) {
      c.target.lerp(g.target, k);
      c.update();
    }
    if (camera.position.distanceTo(g.pos) < 0.01) goal.current = null;
    invalidate();
  });
  return null;
}

const PLANET_LABELS = ORBIT_PLANETS.map((id) => ({ id, text: BODIES[id].name }));

export default function OrbitScene(props: OrbitSceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const registry = useRef<LabelRegistry>(createLabelRegistry());
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  const { distanceMode: mode, epochMs } = props;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas
        dpr={[1, maxDpr(props.quality)]}
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 45, near: 0.01, far: 400, position: [0, 6, 9] }}
        gl={{ antialias: true, alpha: true, powerPreference: "default" }}
        onPointerMissed={() => undefined}
      >
        <StarSphere quality={props.quality} />
        <ambientLight intensity={0.22} />
        <pointLight position={[0, 0, 0]} intensity={60} decay={1.4} />
        <Sun mode={mode} />
        {props.showOrbits &&
          ORBIT_PLANETS.map((id) => <OrbitLine key={`${id}-${mode}`} id={id} mode={mode} epochMs={epochMs} />)}
        {ORBIT_PLANETS.map((id) => (
          <Planet
            key={id}
            id={id}
            mode={mode}
            timeRef={props.timeRef}
            selected={props.selected === id}
            showLabels={props.showLabels}
            onSelect={props.onSelect}
            registry={registry}
          />
        ))}
        <Simulation timeRef={props.timeRef} playing={props.playing} rate={props.rate} onTick={props.onTick} />
        <CameraControl
          view={props.view}
          selected={props.selected}
          mode={mode}
          timeRef={props.timeRef}
          controls={controls}
        />
        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={0.3}
          maxDistance={70}
        />
        <LabelProjector registry={registry} />
      </Canvas>
      <LabelLayer labels={PLANET_LABELS} registry={registry} />
    </div>
  );
}
