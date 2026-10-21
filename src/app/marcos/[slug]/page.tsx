import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublishedProduct } from "@/lib/catalog";
import { clp } from "@/lib/format";
import { ProductGallery } from "@/components/product-gallery";
import { SelectionButtons } from "@/components/selection-button";

export async function generateMetadata({ params }: PageProps<"/marcos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await getPublishedProduct(slug);
    return p ? { title: p.name, description: `${p.name}: marco ${p.material ?? ""} ${p.frameShape ?? ""}`.trim() } : {};
  } catch {
    return {};
  }
}

async function Detail({ params }: { params: PageProps<"/marcos/[slug]">["params"] }) {
  const { slug } = await params;
  let p;
  try {
    p = await getPublishedProduct(slug);
  } catch {
    return (
      <div role="alert" className="border border-line bg-white/60 p-8">
        <h1 className="text-3xl">No pudimos cargar este marco</h1>
        <a href={`/marcos/${slug}`} className="btn mt-4">Reintentar</a>
      </div>
    );
  }
  if (!p) notFound();
  const specs: [string, string | null][] = [
    ["Código", p.sku],
    ["Forma", p.frameShape],
    ["Material", p.material],
    ["Color", p.color],
    ["Ancho del cristal", p.lensWidthMm != null ? `${p.lensWidthMm} mm` : null],
    ["Puente", p.bridgeMm != null ? `${p.bridgeMm} mm` : null],
    ["Varilla", p.templeMm != null ? `${p.templeMm} mm` : null],
  ];
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="min-w-0"><ProductGallery images={p.images} modelUrl={p.modelUrl} name={p.name} /></div>
      <div className="min-w-0">
        {p.brand && <p className="eyebrow">{p.brand}</p>}
        <h1 className="text-[clamp(36px,5vw,60px)]">{p.name}</h1>
        <p className="mt-4 text-2xl">{clp(p.priceClp)} <span className="text-sm text-muted">solo el marco</span></p>
        <p className="mt-1 text-sm text-muted">Los cristales se cotizan aparte según tu receta.</p>
        {p.description && <p className="mt-6">{p.description}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-6 text-sm">
          {specs.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt className="eyebrow">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <SelectionButtons id={p.id} name={p.name} />
        <p className="mt-6 text-sm text-muted">
          La selección no es una compra: revisamos tu receta contigo y confirmamos el total antes de cualquier pago.{" "}
          <Link href="/como-funciona" className="underline">Cómo funciona</Link>
        </p>
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/marcos/[slug]">) {
  return (
    <main className="container-page py-10 md:py-14">
      <Link href="/marcos" className="mb-6 inline-flex min-h-11 items-center text-sm underline">← Volver a marcos</Link>
      <Suspense fallback={<p className="text-muted" role="status">Cargando…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
