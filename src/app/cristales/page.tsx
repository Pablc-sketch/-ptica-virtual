import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cristales", description: "Cómo se definen y cotizan los cristales a partir de tu receta." };

export default function CristalesPage() {
  return (
    <main className="reading-page container-page max-w-3xl py-10 md:py-14">
      <p className="eyebrow">Cristales</p>
      <h1 className="mb-6 text-[clamp(40px,6vw,72px)]">Los cristales se definen con tu receta</h1>
      <div className="space-y-5 text-lg">
        <p>
          El precio que ves en cada ficha es solo el del <strong>marco</strong>. Los cristales dependen de tu receta
          (esfera, cilindro, eje, adición y distancia pupilar), de tu uso y del marco elegido.
        </p>
        <p>
          Por eso no vendemos cristales sin revisar tu receta antes: la revisamos contigo, te proponemos
          opciones y confirmamos el total antes de cualquier pago.
        </p>
        <p className="text-muted">
          Aún no publicamos una lista de tipos de cristal ni precios. Cuando estén confirmados aparecerán aquí;
          hasta entonces se cotizan caso a caso.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/marcos" className="btn">Elegir marco</Link>
        <Link href="/como-funciona" className="btn btn-ghost">Cómo funciona</Link>
      </div>
    </main>
  );
}
