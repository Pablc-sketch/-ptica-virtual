import type { Metadata } from "next";
import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { Suspense } from "react";
import { getPublishedProduct,getPublishedVariantProductSlug } from "@/lib/catalog";
import { productPrice } from "@/lib/product-price";
import { ProductGallery } from "@/components/product-gallery";
import { SelectionButtons } from "@/components/selection-button";
import { CompareButton } from "@/components/compare-button";

export async function generateMetadata({ params }: PageProps<"/marcos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await getPublishedProduct(slug);
    return p ? { title: p.name, description: `${p.name}: marco ${p.material ?? ""} ${p.frameShape ?? ""}`.trim() } : {};
  } catch {
    return {};
  }
}

async function Detail({ params, searchParams }: { params: PageProps<"/marcos/[slug]">["params"]; searchParams: PageProps<"/marcos/[slug]">["searchParams"] }) {
  const { slug } = await params;
  const { color } = await searchParams;
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
  if(typeof color==='string'&&!p.variants?.some(v=>v.id===color)){
    const target=await getPublishedVariantProductSlug(color);
    if(target&&target!==slug)redirect(`/marcos/${encodeURIComponent(target)}?color=${encodeURIComponent(color)}`);
  }
  const specs: [string, string | null][] = [
    ["Forma", p.frameShape],
    ["Material", p.material],
    ["Color", (p.variants?.length ?? 0) > 1 ? null : p.color],
    ["Ancho del cristal", p.lensWidthMm != null ? `${p.lensWidthMm} mm` : null],
    ["Puente", p.bridgeMm != null ? `${p.bridgeMm} mm` : null],
    ["Varilla", p.templeMm != null ? `${p.templeMm} mm` : null],
  ];
  const price = productPrice(p);
  const solar = p.use === "solar";
  return (
    <div className="product-detail grid gap-7 md:grid-cols-2">
      <div className="min-w-0"><ProductGallery images={p.images} modelUrl={p.modelUrl} name={p.name} variants={p.variants} initialColor={typeof color === "string" ? color : undefined} /></div>
      <div className="product-info min-w-0">
        <p className="eyebrow">{p.use==='solar'?'La colección de sol':'La colección óptica'}{p.brand?` · ${p.brand}`:''}</p>
        <h1 className="text-[clamp(36px,5vw,60px)]">{p.name}</h1>
        <p className="mt-4 text-2xl">{price.text}</p>
        <p className="mt-1 text-sm text-muted">{price.label}{solar ? "." : p.pairBasePriceClp ? ". Otros tratamientos y graduaciones se confirman al cotizar." : ". Los cristales se cotizan aparte."}</p>
        {p.isSample && <p className="mt-3 text-xs text-muted">Fotografía retocada del marco.</p>}
        {p.description && <p className="mt-6">{p.description}</p>}
        <details className="mt-6 border-y border-line py-4"><summary className="cursor-pointer text-sm">Detalles y medidas</summary><dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {specs.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt className="eyebrow">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl></details>
        {p.pairBasePriceClp && !solar && <div className="mt-6 grid grid-cols-3 gap-2 text-sm" aria-label="Precios iniciales del par"><div>Básico<p className="mt-1 font-semibold">${p.pairBasePriceClp.toLocaleString("es-CL")}</p></div><div>Antirreflejo<p className="mt-1 font-semibold">${(p.pairBasePriceClp+10000).toLocaleString("es-CL")}</p></div><div>Filtro azul con receta<p className="mt-1 font-semibold">${(p.pairBasePriceClp+20000).toLocaleString("es-CL")}</p></div></div>}
        {!solar && <Link href={`/sin-aumento?q=${encodeURIComponent(p.name)}`} className="mt-4 inline-flex min-h-11 items-center text-sm underline">¿Sin aumento? Este estilo con filtro azul desde ${(p.pairBasePriceClp ? p.pairBasePriceClp+10000 : 38000).toLocaleString("es-CL")} →</Link>}
        <Link href={`/comprar/${p.slug}${typeof color === "string" ? `?color=${encodeURIComponent(color)}` : ""}`} className="btn btn-mp mt-6 w-full">Comprar con Mercado Pago</Link>
        <Link href={`/cotizar-receta?marco=${p.slug}`} className="mt-3 inline-flex min-h-11 items-center text-sm underline">{solar ? "¿Los necesitas con aumento? Cotiza con tu receta →" : "Elegir mis cristales →"}</Link>
        <Link href={`/probador?marco=${p.slug}`} className="btn btn-ghost mt-4 w-full">Probar en mi foto</Link>
        <SelectionButtons id={p.id} />
        <CompareButton id={p.id}/>
        <p className="mt-6 text-sm text-muted">
          {solar?'Elige tus lentes de sol y coordinamos la entrega contigo.':'Un profesional revisará tu receta para preparar tus lentes y confirmar el precio final.'}{" "}
          <Link href="/como-funciona" className="underline">Cómo funciona</Link>
        </p>
      </div>
    </div>
  );
}

export default function ProductPage({ params, searchParams }: PageProps<"/marcos/[slug]">) {
  return (
    <main className="container-page py-10 md:py-14">
      <Link href="/marcos" className="mb-6 inline-flex min-h-11 items-center text-sm underline">← Volver a marcos</Link>
      <Suspense fallback={<p className="text-muted" role="status">Cargando…</p>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
