import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cómo funciona", description: "Del catálogo a la confirmación: así cotizas tus lentes." };

const STEPS = [
  ["Explora y guarda", "Filtra el catálogo, guarda favoritos (solo para ti, en este dispositivo) y agrega marcos a tu selección."],
  ["Solicita tu cotización", "Cuéntanos cuáles te gustaron y cómo podemos contactarte. Te ayudamos a elegir los cristales y a conocer el valor completo."],
  ["Revisamos tu receta", "Un profesional revisa tu receta y confirma los cristales adecuados para tu graduación."],
  ["Confirma el total", "Recibe el detalle de marco, cristales y entrega antes de confirmar tu pedido."],
  ["Tu entrega en Santiago", "La comuna, fecha y costo de entrega se acuerdan contigo al confirmar la cotización."],
];

export default function ComoFuncionaPage() {
  return (
    <main className="reading-page container-page max-w-4xl py-10 md:py-14">
      <p className="eyebrow">Proceso</p>
      <h1 className="mb-8 text-[clamp(40px,6vw,72px)]">Cómo funciona</h1>
      <ol className="space-y-6">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="grid gap-2 border-t border-ink pt-4 sm:grid-cols-[120px_1fr]">
            <span className="eyebrow">Paso {i + 1}</span>
            <div><h2 className="text-2xl">{t}</h2><p className="mt-1 text-muted">{d}</p></div>
          </li>
        ))}
      </ol>
      <h2 className="mb-3 mt-14 text-3xl">Imágenes y 3D</h2>
      <p className="max-w-[65ch] text-muted">
        Las fichas muestran los marcos de la colección; puedes explorar sus colores y medidas. En los marcos con vista 3D puedes girar y acercar
        la imagen para conocer su forma. Para elegir el ajuste, compara las medidas de la ficha o pide orientación.
        En el probador puedes ver el estilo sobre tu foto.
      </p>
      <Link href="/marcos" className="btn mt-8">Ver marcos</Link>
    </main>
  );
}
