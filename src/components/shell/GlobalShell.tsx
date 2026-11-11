import Link from "next/link";
import type { ReactNode } from "react";
import { ModeNav } from "./ModeNav";

/** Estructura de las páginas que no dependen de una estación. */
export function GlobalShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="with-nav">
      <header className="top-bar">
        <Link href="/" className="brand">
          <span
            aria-hidden="true"
            style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-sol)" }}
          />
          Sistema solar a escala
        </Link>
        <span>Ñuble, Chile</span>
      </header>
      <main id="contenido" className={wide ? "" : undefined}>
        {children}
      </main>
      <ModeNav />
    </div>
  );
}
