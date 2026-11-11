"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getConfiguredSiteUrl, stationUrl, validateSiteUrl } from "@/config/site";
import { STATIONS } from "@/config/stations";
import { BODIES } from "@/data/bodies";

/**
 * QR de prueba generados en el navegador con la dirección actual. Sirven para
 * escanear desde el teléfono mientras se prueba con un túnel o en la red local.
 * Los QR definitivos se generan con `npm run qr:prod` (ver docs/QR.md).
 */
export function LiveQr() {
  const [origin] = useState(() => window.location.origin);
  const configured = getConfiguredSiteUrl();
  const [useConfigured, setUseConfigured] = useState(false);
  const base = useConfigured && configured ? configured : origin;
  const check = validateSiteUrl(base, "desarrollo");
  const [svgs, setSvgs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
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
  }, [base]);

  return (
    <div className="wrap-wide" style={{ paddingTop: 14 }}>
      <div className="wrap" style={{ paddingInline: 0 }}>
        <h1 className="page-title">QR de prueba</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Códigos para la dirección <strong style={{ color: "var(--color-snow)" }}>{base}</strong>. Escanéalos con la
          cámara del teléfono. No son los QR para imprimir en las estaciones.
        </p>
        {check.errors.map((e) => (
          <p key={e} className="notice notice--error">
            {e}
          </p>
        ))}
        {check.warnings.map((w) => (
          <p key={w} className="notice" style={{ marginTop: 8 }}>
            {w}
          </p>
        ))}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }} className="no-print">
          {configured && configured !== origin && (
            <button
              type="button"
              className="chip"
              aria-pressed={useConfigured}
              onClick={() => setUseConfigured((v) => !v)}
            >
              Usar la URL configurada ({configured})
            </button>
          )}
          <button type="button" className="btn btn--small" onClick={() => window.print()}>
            Imprimir esta hoja
          </button>
        </div>
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
          gap: 12,
        }}
      >
        {[...STATIONS]
          .sort((a, b) => a.order - b.order)
          .map((s) => (
            <li
              key={s.id}
              className="panel"
              style={{ display: "grid", gap: 8, justifyItems: "center", textAlign: "center", padding: 12 }}
            >
              <div
                style={{ width: "100%", maxWidth: 200, background: "#fff", borderRadius: 8 }}
                dangerouslySetInnerHTML={{ __html: svgs[s.id] ?? "" }}
                aria-label={`Código QR de ${s.name}`}
                role="img"
              />
              <span style={{ fontWeight: 600 }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: BODIES[s.bodyId].color,
                    marginRight: 6,
                  }}
                />
                {s.name}
              </span>
              <span className="small muted" style={{ wordBreak: "break-all" }}>
                {stationUrl(base, s.id)}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
