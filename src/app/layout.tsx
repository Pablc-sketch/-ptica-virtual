import {Suspense} from "react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";


const manrope = Manrope({ subsets: ["latin"], variable: "--font-global", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://opticaglobal.cl"),
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "Óptica Global",
    title: "Óptica Global — Tu forma de ver",
    description: "Marcos ópticos y lentes de sol. Encuentra tu estilo y cotiza tus cristales con revisión profesional.",
    images: [{ url: "/img/banner-optico.webp", width: 1536, height: 1024, alt: "Óptica Global: estilo y visión, imagen de campaña" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/img/banner-optico.webp"],
  },
  robots: { index: false, follow: false },
  icons: { icon: "/brand/logo-original.png" },
  title: { default: "Óptica Global — Visión sin fronteras", template: "%s · Óptica Global" },
  description:
    "Marcos ópticos y lentes de sol. Elige tu estilo, compara colores y cotiza tus cristales con revisión profesional de tu receta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="fixed left-3 -top-24 z-[100] bg-white p-3 focus:top-3"
        >
          Saltar al contenido
        </a>
        <Suspense fallback={<div id="contenido">{children}</div>}><SiteShell>{children}</SiteShell></Suspense>
      </body>
    </html>
  );
}
