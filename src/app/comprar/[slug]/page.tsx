import type { Metadata } from "next";
import { CheckoutPricing } from "@/components/checkout-pricing";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublishedProduct } from "@/lib/catalog";
import { REGIONES } from "@/lib/addresses";
import { paymentsEnabled } from "@/lib/mercadopago";
import { startCheckout } from "../actions";
import { CheckoutColor } from "@/components/checkout-color";

export const metadata: Metadata = { title: "Comprar", robots: { index: false } };

const ERROR_TEXT: Record<string, string> = {
  nombre: "Revisa tu nombre.", correo: "Revisa tu correo.", telefono: "Revisa tu teléfono (ej.: +56 9 1234 5678).",
  direccion: "Revisa la dirección de despacho.", cristal: "Elige el tipo de cristal.", color: "Ese color ya no está disponible.",
  producto: "Este marco no está disponible para compra en línea.", muchas: "Tienes varias compras pendientes. Espera un momento o escríbenos.",
  pago: "El pago en línea aún no está activo.", error: "No pudimos iniciar la compra. Inténtalo de nuevo.",
};

async function Checkout({ params, searchParams }: { params: PageProps<"/comprar/[slug]">["params"]; searchParams: PageProps<"/comprar/[slug]">["searchParams"] }) {
  const { slug } = await params;
  const q = await searchParams;
  const p = await getPublishedProduct(slug).catch(() => null);
  if (!p || !p.pairBasePriceClp) notFound();
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
            ? "Marco y cristales monofocales. Envíanos tu receta por WhatsApp después de comprar."
            : "Lentes de sol listos para usar."}
        </p>
      </aside>

      <form id="checkout" action={startCheckout.bind(null, slug)} className="flex flex-col gap-4">
        <input type="hidden" name="product_id" value={p.id} />
        {error && <p role="alert" className="border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}

        {variants.length === 1 && <input type="hidden" name="variant_id" value={variants[0].id} />}

        <CheckoutPricing basePrice={p.pairBasePriceClp} optical={optical} />

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 font-medium">Tus datos y dirección de despacho</legend>
          <label className="sm:col-span-2">Nombre y apellido<input name="name" required minLength={2} maxLength={120} autoComplete="name" className="field mt-1" /></label>
          <label>Correo<input name="email" type="email" required maxLength={254} autoComplete="email" className="field mt-1" /></label>
          <label>Teléfono<input name="phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" placeholder="+56 9 1234 5678" className="field mt-1" /></label>
          <label>Región<select name="region" required defaultValue="Metropolitana" autoComplete="address-level1" className="field mt-1">{REGIONES.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>Comuna<input name="comuna" required minLength={2} maxLength={60} autoComplete="address-level2" className="field mt-1" /></label>
          <label>Calle<input name="street" required minLength={2} maxLength={120} autoComplete="address-line1" className="field mt-1" /></label>
          <label>Número<input name="street_number" required maxLength={20} className="field mt-1" /></label>
          <label>Depto. / casa (opcional)<input name="unit" maxLength={40} autoComplete="address-line2" className="field mt-1" /></label>
          <label className="sm:col-span-2">Indicaciones para el despacho (opcional)<input name="notes" maxLength={300} className="field mt-1" /></label>
        </fieldset>
        <button className="btn btn-mp" disabled={!enabled}>Pagar con Mercado Pago</button>
        {!enabled && <p role="status" className="text-sm text-muted">El pago en línea con Mercado Pago se está activando. Mientras tanto, escríbenos por WhatsApp para comprar este marco.</p>}
        <p className="text-xs text-muted">Puedes comprar sin crear una cuenta. Te enviamos el detalle a tu correo.</p>
      </form>
    </div>
  );
}

export default function ComprarPage({ params, searchParams }: PageProps<"/comprar/[slug]">) {
  return (
    <main className="container-page py-10 md:py-14">
      <p className="eyebrow">Óptica Global · Compra como invitado</p>
      <h1 className="mb-8 text-[clamp(36px,5vw,60px)]">Tu compra.</h1>
      <Suspense fallback={<p role="status" className="text-muted">Cargando…</p>}>
        <Checkout params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
