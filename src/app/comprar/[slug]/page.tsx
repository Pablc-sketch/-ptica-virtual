import type { Metadata } from "next";
import Link from "next/link";
import { notFound,redirect } from "next/navigation";
import { Suspense } from "react";
import { getPublishedProduct,getPublishedVariantProductSlug } from "@/lib/catalog";
import { REGIONES } from "@/lib/addresses";
import { clp } from "@/lib/format";
import { paymentsEnabled } from "@/lib/mercadopago";
import { startCheckout } from "../actions";
import { CheckoutSubmit } from '@/components/checkout-submit';
import { CheckoutColor } from "@/components/checkout-color";
import {PhoneInput,ContactInput} from '@/components/contact-input';

export const metadata: Metadata = { title: "Comprar", robots: { index: false } };

const LENSES = [
  { id: "basico", name: "Cristal básico", extra: 0, note: "Transparente, para el día a día." },
  { id: "antirreflejo", name: "Antirreflejo", extra: 10000, note: "Menos reflejos en la cara y en pantallas." },
  { id: "filtro-azul", name: "Filtro de luz azul", extra: 20000, note: "Filtra parte de la luz azul de las pantallas." },
];
const ERROR_TEXT: Record<string, string> = {
  nombre: "Revisa tu nombre.", correo: "Revisa tu correo.", telefono: "Revisa tu teléfono (ej.: +56 9 1234 5678).",
  direccion: "Revisa la dirección de despacho.", cristal: "Elige el tipo de cristal.", color: "Ese color ya no está disponible.",
  producto: "Este marco no está disponible para compra en línea.", muchas: "Tienes varias compras pendientes. Espera un momento o escríbenos.",
  acepto: "Debes aceptar las condiciones para continuar.", pago: "El pago en línea aún no está activo.", error: "No pudimos iniciar la compra. Inténtalo de nuevo.",
};

async function Checkout({ params, searchParams }: { params: PageProps<"/comprar/[slug]">["params"]; searchParams: PageProps<"/comprar/[slug]">["searchParams"] }) {
  const { slug } = await params;
  const q = await searchParams;
  const p = await getPublishedProduct(slug).catch(() => null);
  if (!p || !p.pairBasePriceClp) notFound();
  if(typeof q.color==='string'&&!p.variants?.some(v=>v.id===q.color)){
    const target=await getPublishedVariantProductSlug(q.color);
    if(target&&target!==slug)redirect(`/comprar/${encodeURIComponent(target)}?color=${encodeURIComponent(q.color)}`);
  }
  const optical = p.use !== "solar";
  const variants = p.variants ?? [];
  const chosen = variants.find((v) => v.id === q.color) ?? variants[0];
  const enabled = paymentsEnabled();
  const error = typeof q.error === "string" ? ERROR_TEXT[q.error] : undefined;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      <aside className="min-w-0">
        <CheckoutColor variants={variants} initial={chosen?.id} fallback={p.images[0]} formId="checkout" />
        <h2 className="mt-4 text-3xl">{p.name}</h2>
        <p className="text-sm text-muted">{[p.frameShape, p.material].filter(Boolean).join(" · ")}</p>
        <p className="mt-4 text-sm text-muted">
          {optical
            ? "Incluye marco y cristales monofocales con tu receta. Después del pago nos envías tu receta y un profesional la revisa antes de fabricar; si tu graduación requiere otro cristal, te contactamos antes de hacer nada."
            : "Lentes de sol listos para usar."}
        </p>
        {p.isSample && <p className="mt-2 text-xs text-muted">Imagen retocada del marco. Confirmamos disponibilidad al recibir tu compra.</p>}
      </aside>

      <form id="checkout" action={startCheckout.bind(null, slug)} className="flex flex-col gap-4">
        <input type="hidden" name="product_id" value={p.id} />
        {error && <p role="alert" className="border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}

        {variants.length === 1 && <input type="hidden" name="variant_id" value={variants[0].id} />}

        {optical ? (
          <fieldset>
            <legend className="mb-2 font-medium">Cristales</legend>
            <div className="grid gap-2">
              {LENSES.map((l, i) => (
                <label key={l.id} className="flex items-start gap-3 border border-line bg-white/60 p-3">
                  <input type="radio" name="lens" value={l.id} defaultChecked={i === 0} required className="mt-1 h-5 w-5" />
                  <span className="flex-1"><strong>{l.name}</strong><span className="block text-sm text-muted">{l.note}</span></span>
                  <strong>{clp(p.pairBasePriceClp! + l.extra)}</strong>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="flex justify-between border-y border-line py-3 text-lg"><span>Total</span><strong>{clp(p.pairBasePriceClp)}</strong></p>
        )}

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 font-medium">Tus datos y dirección de despacho</legend>
          <label className="sm:col-span-2">Nombre y apellido<ContactInput format="name" name="name" required minLength={2} maxLength={120} autoComplete="name" className="field mt-1" /></label>
          <label>Correo<ContactInput format="email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="nombre@correo.cl" className="field mt-1" /></label>
          <label>Celular<PhoneInput name="phone" required className="field mt-1"/></label>
          <label>Región<select name="region" required defaultValue="Metropolitana" autoComplete="address-level1" className="field mt-1">{REGIONES.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>Comuna<ContactInput format="name" name="comuna" required minLength={2} maxLength={60} autoComplete="address-level2" placeholder="Ej.: Quilicura" className="field mt-1" /></label>
          <label>Calle<ContactInput name="street" required minLength={2} maxLength={120} autoComplete="address-line1" placeholder="Ej.: Av. Las Torres" className="field mt-1" /></label>
          <label>Número<ContactInput format="number" name="street_number" required maxLength={20} placeholder="Ej.: 1234 o S/N" className="field mt-1" /></label>
          <label>Depto. / casa (opcional)<input name="unit" maxLength={40} autoComplete="address-line2" className="field mt-1" /></label>
          <label className="sm:col-span-2">Indicaciones para el despacho (opcional)<input name="notes" maxLength={300} className="field mt-1" /></label>
        </fieldset>
        <p className="text-xs text-muted">El costo y el plazo de despacho te los confirmamos por correo o WhatsApp después de la compra.</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acepto" required className="mt-1 h-5 w-5" />
          <span>Acepto que usen mis datos para procesar y despachar esta compra. Leí el <Link href="/privacidad" className="underline">aviso de privacidad</Link>.</span>
        </label>
        <CheckoutSubmit enabled={enabled}/>
        {!enabled && <p role="status" className="text-sm text-muted">El pago en línea con Mercado Pago se está activando. Mientras tanto, <a className="underline font-medium" href={`https://wa.me/56975512281?text=${encodeURIComponent(`Hola, quiero comprar ${p.name}.`)}`}>escríbenos por WhatsApp para comprar este marco</a>.</p>}
        <p className="text-xs text-muted">Puedes comprar sin crear una cuenta. Al volver del pago, guarda el enlace con el detalle de tu pedido.</p>
      </form>
    </div>
  );
}

export default function ComprarPage({ params, searchParams }: PageProps<"/comprar/[slug]">) {
  return (
    <main className="container-page py-10 md:py-14">
      <p className="eyebrow">Compra segura</p>
      <h1 className="mb-8 text-[clamp(36px,5vw,60px)]">Tu compra.</h1>
      <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}>
        <Checkout params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
