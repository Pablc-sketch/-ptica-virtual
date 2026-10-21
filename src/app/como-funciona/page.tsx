import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cómo funciona", description: "Del catálogo a la confirmación: así cotizas tus lentes." };

const STEPS = [
  ["Explora y guarda", "Filtra el catálogo, guarda favoritos (solo para ti, en este dispositivo) y agrega marcos a tu selección."],
  ["Envía tu cotización", "Tu selección viaja con tus datos de contacto. El servidor fija el precio del marco; nada de montos viene desde tu navegador."],
  ["Revisamos tu receta", "Una persona de la óptica revisa tu receta contigo. Las recetas se tratan como datos sensibles: acceso restringido y enlaces temporales."],
  ["Confirma el total", "Marco + cristales, con el total confirmado por escrito. Sin esa confirmación no hay compra."],
  ["Retiro o entrega", "Coordinamos retiro o entrega cuando todo está confirmado."],
];

export default function ComoFuncionaPage() {
  return (
    <main className="container-page max-w-4xl py-10 md:py-14">
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
        Las fotografías son del modelo real. La vista 3D aparece solo cuando existe un modelo GLB verificado y se
        descarga únicamente al pulsar “Vista 3D”. No es un probador facial ni garantiza el ajuste. Las imágenes
        marcadas como “conceptuales” son ilustrativas.
      </p>
      <Link href="/marcos" className="btn mt-8">Ver marcos</Link>
    </main>
  );
}
