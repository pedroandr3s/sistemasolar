import Link from "next/link";
import type { ReactNode } from "react";
import { ModeNav } from "./ModeNav";

/** Estructura de las páginas que no dependen de una estación. */
export function GlobalShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="with-nav">
      <header className="top-bar">
        <Link href="/" className="brand">
          <span className="brand__mark" aria-hidden="true" />
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
