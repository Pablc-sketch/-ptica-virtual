import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublishedProducts } from "@/lib/catalog";
import { CatalogClient } from "@/components/catalog-client";
import { ComparisonBar } from "@/components/comparison-bar";

export const metadata: Metadata = {
  title: "Marcos",
  description: "Marcos de Óptica Global: formas, colores, medidas y opciones de cristales.",
};

async function CatalogLoader() {
  let products;
  try {
    products = await getPublishedProducts();
  } catch {
    return (
      <div className="border border-line bg-white/60 p-8 text-center" role="alert">
        <h2 className="text-3xl">No pudimos cargar el catálogo</h2>
        <p className="mt-3 text-muted">Ocurrió un problema al consultar los marcos. No es tu conexión: inténtalo otra vez.</p>
        {/* Recarga completa a propósito: reintenta la consulta al servidor. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/marcos" className="btn mt-6">Reintentar</a>
      </div>
    );
  }
  return <CatalogClient products={products} />;
}

export default function MarcosPage() {
  return (
    <main className="container-page">
      <div className="page-heading"><div><p className="eyebrow">Encuentra tu próxima mirada</p><h1>Los marcos.</h1></div><p className="heading-note">Una forma, un color, tu manera de mirar. Elige tu marco y revisa las opciones para tu receta.</p></div>
      <Suspense fallback={<p className="text-muted" role="status">Cargando marcos…</p>}>
        <CatalogLoader />
      </Suspense>
      <ComparisonBar/>
    </main>
  );
}
