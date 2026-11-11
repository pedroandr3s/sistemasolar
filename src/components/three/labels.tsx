"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

/**
 * Etiquetas HTML sobre una escena 3D, sin crear raíces de React dentro del
 * lienzo. Las etiquetas viven en una capa DOM normal (fuera de <Canvas>) y un
 * proyector las posiciona en cada cuadro. Así se evitan los errores de
 * desmontaje de las raíces anidadas y se libera todo al salir de la página.
 */

export interface LabelSpec {
  id: string;
  text: string;
  accent?: boolean;
}

interface AnchorState {
  object: THREE.Object3D;
  active: boolean;
  /** Ocultar si el punto queda en la cara no visible de una esfera centrada en el origen. */
  facing: boolean;
  /** Si dos etiquetas se tocan, se muestra la de mayor prioridad y se oculta la otra. */
  priority: number;
}

export interface LabelRegistry {
  anchors: Map<string, AnchorState>;
  elements: Map<string, HTMLElement>;
}

export function createLabelRegistry(): LabelRegistry {
  return { anchors: new Map(), elements: new Map() };
}

/** Capa DOM con las etiquetas. Debe ir dentro de un contenedor con position: relative. */
export function LabelLayer({ labels, registry }: { labels: LabelSpec[]; registry: RefObject<LabelRegistry> }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {labels.map((l) => (
        <div
          key={l.id}
          ref={(el) => {
            const reg = registry.current;
            if (!reg) return;
            if (el) reg.elements.set(l.id, el);
            else reg.elements.delete(l.id);
          }}
          className="planet-label"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            opacity: 0,
            borderColor: l.accent ? "var(--color-sol)" : undefined,
          }}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}

/** Punto de anclaje dentro de la escena. */
export function Anchor({
  id,
  position,
  active,
  facing = true,
  priority = 0,
  registry,
}: {
  id: string;
  position: [number, number, number] | THREE.Vector3;
  active: boolean;
  facing?: boolean;
  priority?: number;
  registry: RefObject<LabelRegistry>;
}) {
  const ref = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const reg = registry.current;
    if (!reg || !ref.current) return;
    reg.anchors.set(id, { object: ref.current, active, facing, priority });
    invalidate();
    return () => {
      reg.anchors.delete(id);
      const el = reg.elements.get(id);
      if (el) el.style.opacity = "0";
    };
  }, [id, active, facing, priority, registry, invalidate]);
  const pos = position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position);
  return <group ref={ref} position={pos} />;
}

interface Placed {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Margen (px) que debe quedar libre entre dos etiquetas. */
const LABEL_GAP = 4;
/** Distancia (px) entre el punto anclado y la etiqueta (largo de la línea guía). */
const LEADER = 8;

function overlaps(a: Placed, b: Placed): boolean {
  return a.x0 < b.x1 + LABEL_GAP && a.x1 > b.x0 - LABEL_GAP && a.y0 < b.y1 + LABEL_GAP && a.y1 > b.y0 - LABEL_GAP;
}

/**
 * Zonas ocupadas por controles flotantes sobre el lienzo (elementos con
 * `data-label-avoid` dentro del mismo contenedor), en coordenadas del lienzo.
 */
function reservedAreas(canvas: HTMLCanvasElement): Placed[] {
  const host = canvas.closest(".stage") ?? canvas.parentElement;
  if (!host) return [];
  const origin = canvas.getBoundingClientRect();
  return Array.from(host.querySelectorAll<HTMLElement>("[data-label-avoid]")).map((el) => {
    const r = el.getBoundingClientRect();
    return { x0: r.left - origin.left, y0: r.top - origin.top, x1: r.right - origin.left, y1: r.bottom - origin.top };
  });
}

/**
 * Proyecta cada anclaje a la pantalla y mueve su etiqueta.
 * - Las etiquetas se mantienen dentro del lienzo (nunca quedan cortadas en un borde).
 * - Se colocan sobre su punto; si ahí chocan con otra etiqueta o con un control
 *   flotante, se prueban debajo del punto; si tampoco caben, se ocultan.
 * - El orden lo da la prioridad (p. ej. el planeta elegido primero); a igual
 *   prioridad, el orden de registro.
 */
export function LabelProjector({ registry }: { registry: RefObject<LabelRegistry> }) {
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size, gl }) => {
    const reg = registry.current;
    if (!reg) return;
    const items: {
      el: HTMLElement;
      visible: boolean;
      x: number;
      py: number;
      w: number;
      h: number;
      priority: number;
      order: number;
    }[] = [];
    let order = 0;
    for (const [id, a] of reg.anchors) {
      const el = reg.elements.get(id);
      if (!el) continue;
      a.object.getWorldPosition(tmp);
      let visible = a.active;
      if (visible && a.facing) {
        normal.copy(tmp).normalize();
        camDir.copy(camera.position).sub(tmp).normalize();
        visible = normal.dot(camDir) > 0.12;
      }
      tmp.project(camera);
      if (tmp.z > 1 || tmp.z < -1) visible = false;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // Mantener la etiqueta dentro del lienzo (se centra sobre su punto).
      const half = w / 2;
      const rawX = (tmp.x * 0.5 + 0.5) * size.width;
      const x = Math.min(Math.max(rawX, half + 6), Math.max(half + 6, size.width - half - 6));
      const py = (-tmp.y * 0.5 + 0.5) * size.height;
      items.push({ el, visible, x, py, w, h, priority: a.priority, order: order++ });
    }
    items.sort((p, q) => q.priority - p.priority || p.order - q.order);
    const placed: Placed[] = items.some((it) => it.visible) ? reservedAreas(gl.domElement) : [];
    for (const it of items) {
      let side: "above" | "below" | null = null;
      let y = 0;
      if (it.visible) {
        const x0 = it.x - it.w / 2;
        const x1 = it.x + it.w / 2;
        // Arriba del punto (sin salirse por el borde superior).
        const yAbove = Math.max(it.py, it.h + LEADER + 6);
        const above = { x0, x1, y0: yAbove - LEADER - it.h, y1: yAbove - LEADER };
        // Debajo del punto (sin salirse por el borde inferior).
        const yBelow = Math.min(it.py, size.height - it.h - LEADER - 6);
        const below = { x0, x1, y0: yBelow + LEADER, y1: yBelow + LEADER + it.h };
        if (!placed.some((b) => overlaps(above, b))) {
          side = "above";
          y = yAbove;
          placed.push(above);
        } else if (!placed.some((b) => overlaps(below, b))) {
          side = "below";
          y = yBelow;
          placed.push(below);
        }
      }
      if (side) {
        it.el.dataset.side = side;
        it.el.style.transform =
          side === "above"
            ? `translate3d(${it.x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, calc(-100% - ${LEADER}px))`
            : `translate3d(${it.x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${LEADER}px)`;
      }
      const value = side ? "1" : "0";
      if (it.el.style.opacity !== value) it.el.style.opacity = value;
    }
  });
  return null;
}
