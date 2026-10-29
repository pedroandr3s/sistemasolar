"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const LEVELS = [
  { key: "descubrir", label: "Descubrir" },
  { key: "entender", label: "Entender mejor" },
  { key: "profundizar", label: "Profundizar" },
] as const;

type LevelKey = (typeof LEVELS)[number]["key"];

/**
 * Tres niveles de profundidad en la misma página: se pasa de uno a otro sin
 * recargar ni perder el lugar. El contenido de cada nivel se genera en el servidor.
 */
export function LevelTabs({ panels }: { panels: Record<LevelKey, ReactNode> }) {
  const [active, setActive] = useState<LevelKey>("descubrir");
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = LEVELS.findIndex((l) => l.key === active);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % LEVELS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + LEVELS.length) % LEVELS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = LEVELS.length - 1;
    else return;
    e.preventDefault();
    const level = LEVELS[next];
    if (level) {
      setActive(level.key);
      tabRefs.current[next]?.focus();
    }
  }

  return (
    <div>
      <div className="levels" role="tablist" aria-label="Nivel de profundidad" onKeyDown={onKey}>
        {LEVELS.map((l, i) => (
          <button
            key={l.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${l.key}`}
            aria-selected={active === l.key}
            aria-controls={`${baseId}-panel-${l.key}`}
            tabIndex={active === l.key ? 0 : -1}
            onClick={() => setActive(l.key)}
          >
            {l.label}
          </button>
        ))}
      </div>
      {LEVELS.map((l) => (
        <div
          key={l.key}
          role="tabpanel"
          id={`${baseId}-panel-${l.key}`}
          aria-labelledby={`${baseId}-tab-${l.key}`}
          hidden={active !== l.key}
          style={{ marginTop: 20 }}
        >
          {panels[l.key]}
        </div>
      ))}
    </div>
  );
}
