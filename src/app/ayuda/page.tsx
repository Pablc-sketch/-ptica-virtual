import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ayuda", description: "Preguntas frecuentes sobre marcos, recetas y cotizaciones." };

const FAQ = [
  ["¿Puedo comprar directamente?", "No. Primero cotizas; revisamos tu receta contigo y confirmamos el total antes de cualquier pago."],
  ["¿El precio incluye cristales?", "No. El precio publicado es solo el del marco. Los cristales se cotizan con tu receta."],
  ["¿Qué son los favoritos y la selección?", "Los favoritos son un guardado personal. La selección es la lista de marcos que enviarás a cotizar. Ambos se guardan solo en tu navegador."],
  ["¿Cómo se tratan mis datos y mi receta?", "La receta es un dato sensible: solo tú y el equipo autorizado pueden verla y los enlaces de acceso son temporales. Solo la pedimos cuando estás en una cotización."],
  ["¿La vista 3D me dice cómo me queda?", "No. Es una referencia del modelo del marco. No es un probador facial ni garantiza el ajuste: usa las medidas de la ficha."],
  ["¿Por qué no veo ciertos marcos?", "Solo publicamos marcos con fotografía real verificada, precio confirmado y medidas."],
];

export default function AyudaPage() {
  return (
    <main className="container-page max-w-3xl py-10 md:py-14">
      <p className="eyebrow">Ayuda</p>
      <h1 className="mb-8 text-[clamp(40px,6vw,72px)]">Preguntas frecuentes</h1>
      <div className="divide-y divide-line border-y border-line">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group py-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg">
              {q}<span aria-hidden="true" className="text-muted group-open:rotate-45">+</span>
            </summary>
            <p className="pb-4 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
