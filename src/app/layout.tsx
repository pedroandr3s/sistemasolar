import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_DESCRIPTION, SITE_NAME, getConfiguredSiteUrl } from "@/config/site";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const barlow = localFont({
  src: [
    { path: "../fonts/barlow-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/barlow-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/barlow-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = localFont({
  src: [
    { path: "../fonts/barlow-condensed-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/barlow-condensed-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/barlow-condensed-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const siteUrl = getConfiguredSiteUrl();

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "es_CL",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: "Sistema solar", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0f1830",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
