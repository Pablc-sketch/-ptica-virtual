import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-global", display: "swap" });

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  icons: { icon: "/brand/logo-original.png" },
  title: { default: "Óptica Global — Visión sin fronteras", template: "%s · Óptica Global" },
  description:
    "Catálogo de marcos ópticos con fotografías reales y, cuando existe, vista 3D verificada. Cotiza el marco y revisa tu receta con nosotros.",
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
        <SiteHeader />
        <div id="contenido" className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
