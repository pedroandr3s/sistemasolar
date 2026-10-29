"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Icon } from "@/components/ui/Icon";
import { PlanetOrb } from "@/components/ui/PlanetOrb";
import { getConfiguredSiteUrl, normalizeBaseUrl, stationUrl, validateSiteUrl } from "@/config/site";
import { STATIONS } from "@/config/stations";

interface Candidate {
  label: string;
  url: string;
}

/**
 * Simulador de QR: muestra en la pantalla del computador los códigos de las ocho
 * estaciones para escanearlos con el teléfono. Los códigos llevan la dirección con que
 * el TELÉFONO puede abrir la app: si el computador abrió la app como «localhost», se
 * ofrecen las direcciones de la red local (las detecta el propio servidor).
 * No son los QR para imprimir en las estaciones (ver docs/QR.md).
 */
export function LiveQr() {
  const [origin] = useState(() => window.location.origin);
  const configured = getConfiguredSiteUrl();
  const [lan, setLan] = useState<Candidate[]>([]);
  const [custom, setCustom] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [selected, setSelected] = useState(STATIONS[0]?.id ?? "sol");
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const isLocalOrigin = useMemo(() => {
    try {
      return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname);
    } catch {
      return false;
    }
  }, [origin]);

  // Direcciones de la red local (solo existen si el servidor corre en el computador).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/red", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { port: string; addresses: { name: string; address: string }[] } | null) => {
        if (cancelled || !data) return;
        const protocol = new URL(origin).protocol;
        const port = data.port ? `:${data.port}` : "";
        setLan(
          data.addresses.map((a) => ({ label: `${a.address} (${a.name})`, url: `${protocol}//${a.address}${port}` })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [origin]);

  const candidates: Candidate[] = useMemo(() => {
    const list: Candidate[] = [];
    if (!isLocalOrigin) list.push({ label: "Esta dirección", url: origin });
    list.push(...lan);
    if (configured && !list.some((c) => c.url === configured)) list.push({ label: "URL configurada", url: configured });
    if (isLocalOrigin) list.push({ label: "localhost (solo este computador)", url: origin });
    return list;
  }, [isLocalOrigin, origin, lan, configured]);

  const customUrl = custom.trim() ? normalizeBaseUrl(custom) : null;
  const base = customUrl ?? choice ?? candidates[0]?.url ?? origin;
  const check = validateSiteUrl(base, "desarrollo");
  const isHttps = base.startsWith("https://");

  useEffect(() => {
    let cancelled = false;
    if (!check.url || check.errors.length > 0) return;
    Promise.all(
      STATIONS.map(
        async (s) =>
          [
            s.id,
            await QRCode.toString(stationUrl(base, s.id), {
              type: "svg",
              errorCorrectionLevel: "Q",
              margin: 4,
              color: { dark: "#000000", light: "#ffffff" },
            }),
          ] as const,
      ),
    ).then((pairs) => {
      if (!cancelled) setSvgs(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [base, check.url, check.errors.length]);

  const sorted = [...STATIONS].sort((a, b) => a.order - b.order);
  const current = sorted.find((s) => s.id === selected) ?? sorted[0]!;
  const currentUrl = stationUrl(base, current.id);

  async function copy() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // sin portapapeles: la dirección está visible para copiarla a mano
    }
  }

  return (
    <div className="wrap-wide" style={{ paddingTop: 14, display: "grid", gap: 18 }}>
      <div style={{ maxWidth: "46rem" }}>
        <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>
          Simulador de QR
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Para probar sin estar en la ruta: deja esta página abierta en tu computador y escanea un código con tu
          celular. Verás el planeta en 3D y, con un celular compatible, en realidad aumentada.
        </p>
      </div>

      <ol className="steps" style={{ gridTemplateColumns: undefined }}>
        <li>
          <span>
            <strong>Misma red Wi-Fi</strong>
            <span className="muted small">El computador y el celular deben estar conectados a la misma red.</span>
          </span>
        </li>
        <li>
          <span>
            <strong>Escanea con el celular</strong>
            <span className="muted small">
              Usa la cámara del celular o, en la portada, el botón «Escanear QR» (necesita https).
            </span>
          </span>
        </li>
        <li>
          <span>
            <strong>Mira el planeta</strong>
            <span className="muted small">En la estación, pulsa «Ver en realidad aumentada».</span>
          </span>
        </li>
      </ol>

      <section className="panel" style={{ display: "grid", gap: 10 }} aria-labelledby="dir">
        <h2 id="dir" className="section-title" style={{ fontSize: "1.2rem", margin: 0 }}>
          Dirección que abrirá el celular
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Direcciones disponibles">
          {candidates.map((c) => (
            <button
              key={c.url + c.label}
              type="button"
              className="chip"
              aria-pressed={!customUrl && base === c.url}
              onClick={() => {
                setCustom("");
                setChoice(c.url);
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className="small muted" style={{ display: "grid", gap: 4 }}>
          O escribe otra dirección (por ejemplo, la de un túnel https)
          <input
            type="url"
            inputMode="url"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="https://abc-123.trycloudflare.com"
            style={{
              minHeight: 44,
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid var(--line-strong)",
              background: "rgb(15 24 48 / 0.8)",
              color: "var(--color-snow)",
              font: "inherit",
            }}
          />
        </label>
        {check.errors.map((e) => (
          <p key={e} className="notice notice--error" style={{ margin: 0 }}>
            {e}
          </p>
        ))}
        {isLocalOrigin && lan.length === 0 && check.errors.length === 0 && (
          <p className="notice" style={{ margin: 0 }}>
            <span>
              Esta página se abrió como «localhost»: un celular no puede abrir esa dirección. Inicia la app con{" "}
              <code>npm run dev:red</code> (o <code>npm run start:red</code>) y abre esta página con la IP del
              computador, o escribe arriba la dirección.
            </span>
          </p>
        )}
        {!isHttps && check.errors.length === 0 && (
          <p className="notice" style={{ margin: 0 }}>
            <span>
              Con http se ve el 3D, pero el navegador bloquea la cámara dentro de la página y la realidad aumentada de
              Android. Para probarlas abre la app con https: <code>npm run tunel</code> (túnel gratuito) o{" "}
              <code>npm run dev:https</code>.
            </span>
          </p>
        )}
      </section>

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
        <section className="panel" style={{ display: "grid", gap: 12, justifyItems: "center", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PlanetOrb id={current.bodyId} size={52} />
            <h2 className="display" style={{ fontSize: "2rem", margin: 0 }}>
              {current.name}
            </h2>
          </div>
          <div
            style={{ width: "min(100%, 360px)", background: "#fff", borderRadius: 14, minHeight: 200 }}
            dangerouslySetInnerHTML={{ __html: check.errors.length === 0 ? (svgs[current.id] ?? "") : "" }}
            aria-label={`Código QR de ${current.name}`}
            role="img"
          />
          <p className="small muted" style={{ margin: 0, wordBreak: "break-all" }}>
            {currentUrl}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }} className="no-print">
            <button type="button" className="btn btn--small" onClick={() => void copy()}>
              {copied ? "¡Copiado!" : "Copiar enlace"}
            </button>
            <Link href={`/estacion/${current.id}`} className="btn btn--small">
              Abrir aquí
            </Link>
            <button type="button" className="btn btn--small" onClick={() => window.print()}>
              Imprimir este código
            </button>
          </div>
        </section>

        <section aria-labelledby="todas">
          <h2 id="todas" className="section-title" style={{ fontSize: "1.2rem" }}>
            Elige la estación
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            }}
          >
            {sorted.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="planet-chip"
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    color: "inherit",
                    font: "inherit",
                    borderColor: s.id === current.id ? "var(--color-sol)" : undefined,
                  }}
                  aria-pressed={s.id === current.id}
                  onClick={() => setSelected(s.id)}
                >
                  <PlanetOrb id={s.bodyId} size={48} />
                  <span className="planet-chip__name">{s.name}</span>
                  <span className="planet-chip__km">Estación {s.order + 1}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ marginTop: 14 }}>
            <Icon name="info" size={16} /> Estos códigos son de prueba. Los definitivos para imprimir se generan con{" "}
            <code>npm run qr:prod</code> cuando exista el dominio.
          </p>
        </section>
      </div>
    </div>
  );
}
