import Link from "next/link";
import { GlobalShell } from "@/components/shell/GlobalShell";

export default function NotFound() {
  return (
    <GlobalShell>
      <div className="wrap" style={{ paddingTop: 40 }}>
        <h1 className="display" style={{ fontSize: "2.6rem", margin: 0 }}>
          Esta página no existe
        </h1>
        <p className="muted">
          Puede que el código QR tenga un error o que la dirección esté incompleta. Desde el inicio puedes llegar a
          todas las estaciones.
        </p>
        <Link href="/" className="btn btn--primary">
          Ir al inicio
        </Link>
      </div>
    </GlobalShell>
  );
}
