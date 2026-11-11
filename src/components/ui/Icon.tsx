import type { SVGProps } from "react";

export type IconName =
  | "planet"
  | "compass"
  | "orbits"
  | "map"
  | "learn"
  | "arrow-right"
  | "arrow-left"
  | "play"
  | "pause"
  | "reset"
  | "plus"
  | "minus"
  | "expand"
  | "collapse"
  | "tag"
  | "warning"
  | "check"
  | "location"
  | "crosshair"
  | "route"
  | "info"
  | "close"
  | "clock"
  | "eye"
  | "step-back"
  | "step-forward"
  | "qr"
  | "ar";

const PATHS: Record<IconName, React.ReactNode> = {
  planet: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M3.5 15.5c-1.3 1.6-1.6 2.9-.9 3.5 1.4 1.2 6.4-1.3 11.1-5.6 4.8-4.3 7.5-9 6.1-10.2-.7-.6-2.1-.3-3.8.8" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  orbits: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="9.5" strokeDasharray="2 2.6" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  learn: (
    <>
      <path d="M3 5.5c3-1.2 6-1.2 9 .8 3-2 6-2 9-.8v13c-3-1.2-6-1.2-9 .8-3-2-6-2-9-.8z" />
      <path d="M12 6.3v13" />
    </>
  ),
  "arrow-right": <path d="M5 12h13m-5-5 5 5-5 5" />,
  "arrow-left": <path d="M19 12H6m5-5-5 5 5 5" />,
  play: <path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5.5" width="3.6" height="13" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.9" y="5.5" width="3.6" height="13" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  reset: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v4h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  expand: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />,
  collapse: <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />,
  tag: (
    <>
      <path d="M3.5 12.5V4.5h8l9 9-8 8z" />
      <circle cx="8" cy="9" r="1.4" fill="currentColor" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  location: (
    <>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="7.5" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h6a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "step-back": <path d="M18 6v12l-8-6zM7 6v12" />,
  "step-forward": <path d="M6 6v12l8-6zM17 6v12" />,
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 20.5h2.5" />
    </>
  ),
  ar: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="m12 7 4.5 2.5v5L12 17l-4.5-2.5v-5z" />
    </>
  ),
};

export function Icon({ name, size = 22, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
