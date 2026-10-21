import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublishedProducts } from "@/lib/catalog";
import { CatalogClient } from "@/components/catalog-client";

export const metadata: Metadata = {
  title: "Marcos",
  description: "Catálogo de marcos con fotografías reales, medidas y precio del marco.",
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
    <main className="container-page py-10 md:py-14">
      <p className="eyebrow">Catálogo</p>
      <h1 className="mb-2 text-[clamp(40px,6vw,72px)]">Marcos</h1>
      <p className="mb-8 max-w-[60ch] text-muted">
        El precio corresponde solo al marco. Los cristales se cotizan aparte con tu receta.
      </p>
      <Suspense fallback={<p className="text-muted" role="status">Cargando marcos…</p>}>
        <CatalogLoader />
      </Suspense>
    </main>
  );
}
