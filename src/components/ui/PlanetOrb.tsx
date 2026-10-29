import type { CSSProperties } from "react";
import { BODIES, type BodyId } from "@/data/bodies";

/**
 * Esfera decorativa de un cuerpo celeste, hecha solo con CSS y las mismas
 * texturas del visor 3D (sin cargar Three.js). Gira despacio, salvo si la
 * persona pidió menos movimiento. Es decorativa: el nombre va en el texto contiguo.
 */
const ATMOSPHERE: Partial<Record<BodyId, string>> = {
  tierra: "110 170 255",
  venus: "255 214 130",
  marte: "255 140 100",
  jupiter: "255 205 150",
  saturno: "245 220 160",
  urano: "150 230 235",
  mercurio: "190 190 200",
};

export function PlanetOrb({ id, size = 64, spin = true }: { id: BodyId; size?: number; spin?: boolean }) {
  const body = BODIES[id];
  const texture =
    id === "venus" ? (body.render.cloudCover ?? body.render.texture?.low) : (body.render.texture?.low ?? null);
  const glow = ATMOSPHERE[id] ?? "255 190 90";
  const style = {
    "--s": `${size}px`,
    "--glow": glow,
    "--base": body.color,
    ...(texture ? { backgroundImage: `url(${texture})` } : {}),
  } as CSSProperties;

  return (
    <span
      className={`orb orb--${id}${spin ? " orb--spin" : ""}`}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      {id === "saturno" && <span className="orb__ring orb__ring--back" />}
      <span className={`orb__body${texture ? "" : " orb__body--plain"}`} style={style} />
      {id === "saturno" && <span className="orb__ring orb__ring--front" />}
    </span>
  );
}
