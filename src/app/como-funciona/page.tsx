import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cómo funciona", description: "Del catálogo a la confirmación: así cotizas tus lentes." };

const STEPS = [
  ["Explora y guarda", "Filtra el catálogo, guarda favoritos (solo para ti, en este dispositivo) y agrega marcos a tu selección."],
  ["Solicita tu cotización", "Cuéntanos cuáles te gustaron y cómo podemos contactarte. Te ayudamos a elegir los cristales y a conocer el valor completo."],
  ["Revisamos tu receta", "Una persona de la óptica revisa tu receta contigo. Las recetas se tratan como datos sensibles: acceso restringido y enlaces temporales."],
  ["Confirma el total", "Marco + cristales, con el total confirmado por escrito. Sin esa confirmación no hay compra."],
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
        Las fotografías de catálogo corresponden al modelo real. En los marcos con vista 3D puedes girar y acercar
        la imagen para conocer su forma. Para elegir el ajuste, compara las medidas de la ficha o pide orientación.
        Las imágenes marcadas como “conceptuales” son composiciones de ambiente.
      </p>
      <Link href="/marcos" className="btn mt-8">Ver marcos</Link>
    </main>
  );
}
