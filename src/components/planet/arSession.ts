"use client";

/**
 * Parte 3D de la realidad aumentada. Se carga de forma diferida desde ./ar
 * únicamente cuando el visitante pulsa «Realidad aumentada».
 */
import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { xr, type XRSessionLike } from "./ar";

function loadTexture(url: string): Promise<THREE.Texture | null> {
  return new THREE.TextureLoader()
    .loadAsync(url)
    .then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })
    .catch(() => null);
}

/** Modelo sencillo del cuerpo para AR (radio en metros). */
async function buildModel(body: Body, radius: number): Promise<THREE.Group> {
  const group = new THREE.Group();
  const tilt = body.obliquityDeg > 90 ? 180 - body.obliquityDeg : body.obliquityDeg;
  group.rotation.z = (-tilt * Math.PI) / 180;
  const texUrl = body.render.cloudCover ?? body.render.texture?.low;
  const map = texUrl ? await loadTexture(texUrl) : null;
  const material =
    body.id === "sol"
      ? new THREE.MeshBasicMaterial({ color: "#ffb347" })
      : new THREE.MeshStandardMaterial({ map, color: map ? "#ffffff" : body.color, roughness: 1 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), material);
  sphere.scale.y = body.render.polarRatio;
  group.add(sphere);
  const rings = body.render.rings;
  if (rings) {
    const planetR = body.diameterKm / 2;
    const inner = (rings.innerKm / planetR) * radius;
    const outer = (rings.outerKm / planetR) * radius;
    const geo = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    const ringMap = await loadTexture(rings.texture);
    const ring = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: ringMap, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
  }
  return group;
}

/** AR Quick Look (iOS): exporta un USDZ y lo abre con el visor del sistema. */
export async function openQuickLook(body: Body): Promise<void> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const scene = new THREE.Scene();
  scene.add(await buildModel(body, 0.25));
  const exporter = new USDZExporter();
  const data = await exporter.parseAsync(scene);
  const blob = new Blob([data as BlobPart], { type: "model/vnd.usdz+zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.rel = "ar";
  a.href = url;
  a.appendChild(document.createElement("img"));
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

/**
 * WebXR (Android): coloca el cuerpo 1,2 m delante de la mirada, a la altura de los ojos.
 * `onEnd` avisa cuando la sesión termina por cualquier motivo (botón, gesto «atrás», el sistema).
 *
 * La posición se toma de la pose del visor que entrega el propio `XRFrame` (no de la cámara de
 * three.js) y se puede volver a colocar con el botón «Recolocar». Mientras dura la sesión se
 * muestra un texto de ayuda (hacia dónde está el planeta) y una línea de diagnóstico.
 */
/** Crea el renderer; si el teléfono no da el contexto pedido, prueba con opciones más ligeras. */
function createRenderer(): THREE.WebGLRenderer {
  const attempts: THREE.WebGLRendererParameters[] = [
    { antialias: true, alpha: true },
    { antialias: false, alpha: true },
    { antialias: false, alpha: true, powerPreference: "low-power", precision: "mediump" },
  ];
  let lastError: unknown = null;
  for (const opts of attempts) {
    try {
      return new THREE.WebGLRenderer(opts);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("No se pudo crear el contexto WebGL");
}

export async function startWebXR(body: Body, overlay: HTMLElement, onEnd?: () => void): Promise<() => void> {
  const sys = xr();
  if (!sys) throw new Error("WebXR no disponible");
  // Debe pedirse dentro del toque del usuario: antes de cualquier trabajo largo.
  const session = await sys.requestSession("immersive-ar", {
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: overlay },
  });

  const renderer = createRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;
  // «local»: el origen es donde estaba el teléfono al empezar (siempre disponible en AR).
  renderer.xr.setReferenceSpaceType("local");
  // El lienzo queda en el documento y «dibujado» (no con display: none), pero invisible.
  renderer.domElement.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(renderer.domElement);

  // Textos y botón de ayuda dentro de la superposición.
  const hud = document.createElement("div");
  hud.style.cssText =
    "position:absolute;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);padding:10px 14px;border-radius:14px;background:rgba(15,24,48,.82);color:#eef2f7;font:500 15px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none;";
  const hint = document.createElement("div");
  const diag = document.createElement("div");
  diag.style.cssText = "margin-top:4px;font-size:11px;opacity:.65;";
  hud.append(hint, diag);
  const replace = document.createElement("button");
  replace.type = "button";
  replace.className = "btn";
  replace.textContent = "Recolocar frente a mí";
  replace.style.cssText =
    "position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 96px);pointer-events:auto;background:rgba(15,24,48,.82);";
  overlay.append(hud, replace);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-1, 0.5, 1);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 50);

  let model: THREE.Group | null = null;
  let modelState = "cargando";
  let needsPlacement = true;
  let frames = 0;
  let poseFrames = 0;
  let last = performance.now();
  let lastHint = 0;
  let ended = false;
  const DIST = 1.2;

  replace.onclick = () => {
    needsPlacement = true;
  };

  const cleanup = () => {
    if (ended) return;
    ended = true;
    renderer.setAnimationLoop(null);
    hud.remove();
    replace.remove();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        (x as THREE.MeshStandardMaterial).map?.dispose();
        x.dispose();
      });
    });
    renderer.dispose();
    renderer.domElement.remove();
    onEnd?.();
  };
  session.addEventListener("end", cleanup, { once: true });

  try {
    await renderer.xr.setSession(session as XRSessionLike as unknown as XRSession);
  } catch (e) {
    session.end().catch(() => undefined);
    cleanup();
    throw e;
  }

  const q = new THREE.Quaternion();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const toModel = new THREE.Vector3();

  // Empieza a dibujar de inmediato: la cámara se ve mientras se carga el planeta.
  renderer.setAnimationLoop((_time, frame) => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    frames++;

    const refSpace = renderer.xr.getReferenceSpace();
    const pose = frame && refSpace ? (frame as XRFrame).getViewerPose(refSpace) : null;
    if (pose) {
      poseFrames++;
      const p = pose.transform.position;
      const o = pose.transform.orientation;
      pos.set(p.x, p.y, p.z);
      q.set(o.x, o.y, o.z, o.w);
      fwd.set(0, 0, -1).applyQuaternion(q);
      right.set(1, 0, 0).applyQuaternion(q);
      // Dirección horizontal de la mirada (si se mira muy arriba o abajo, se usa la completa).
      const flat = new THREE.Vector3(fwd.x, 0, fwd.z);
      const look = flat.lengthSq() > 0.05 ? flat.normalize() : fwd.clone();

      if (model && needsPlacement && poseFrames > 2) {
        model.position.set(pos.x + look.x * DIST, pos.y - 0.05, pos.z + look.z * DIST);
        needsPlacement = false;
      }

      if (model && !needsPlacement && now - lastHint > 250) {
        lastHint = now;
        toModel.copy(model.position).sub(pos);
        const ahead = toModel.dot(look);
        const side = toModel.dot(right.setY(0).normalize());
        const angle = (Math.atan2(side, ahead) * 180) / Math.PI;
        hint.textContent =
          Math.abs(angle) < 30 && ahead > 0
            ? `${body.name} está frente a ti`
            : Math.abs(angle) > 120
              ? `${body.name} quedó detrás de ti: gira el teléfono`
              : `${body.name} está a tu ${angle > 0 ? "derecha" : "izquierda"}: gira el teléfono`;
      } else if (!model) {
        hint.textContent = `Cargando ${body.name}…`;
      }
    } else if (frames > 60 && poseFrames === 0) {
      hint.textContent = "El teléfono aún no detecta el entorno: muévelo despacio y apunta a una zona con textura.";
    } else if (poseFrames === 0) {
      hint.textContent = "Mueve el teléfono despacio para que detecte el entorno.";
    }
    diag.textContent = `diagnóstico: cuadros ${frames} · pose ${poseFrames > 0 ? "sí" : "no"} · modelo ${modelState}`;

    if (model && !needsPlacement) model.children[0]!.rotation.y += dt * 0.3;
    renderer.render(scene, camera);
  });

  buildModel(body, 0.2)
    .then((m) => {
      if (ended) return;
      m.position.set(0, 0, -DIST);
      model = m;
      modelState = "listo";
      scene.add(m);
    })
    .catch((e) => {
      modelState = "error";
      console.warn("[AR] modelo", e);
    });

  return () => {
    session.end().catch(() => cleanup());
  };
}
