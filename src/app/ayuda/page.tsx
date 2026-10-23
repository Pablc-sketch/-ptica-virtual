import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ayuda", description: "Preguntas frecuentes sobre marcos, recetas y cotizaciones." };

const FAQ = [
  ["¿Cómo compro mis lentes?", "Elige tu marco y solicita una cotización. Revisamos tu receta contigo y confirmamos el valor completo antes de pagar."],
  ["¿El precio incluye cristales?", "Cuando la ficha dice «marco + lentes básicos», el precio inicial incluye ambos. Antirreflejo y filtro azul tienen un adicional visible. La graduación y las medidas se revisan para confirmar el total."],
  ["¿Qué son los favoritos y la selección?", "Los favoritos son un guardado personal. La selección es la lista de marcos que enviarás a cotizar. Ambos se guardan solo en tu navegador."],
  ["¿Cómo se tratan mis datos y mi receta?", "Puedes subir una foto o PDF desde Mi cuenta. Solo tú y el equipo autorizado pueden acceder al archivo. Un profesional lo revisa para preparar tus lentes."],
  ["¿Puedo probarme los marcos?", "Sí: en el probador puedes subir tu foto, usar la cámara o elegir un modelo de demostración. El marco se alinea con tus ojos y puedes corregirlo con dos marcas. Las fichas que tengan un modelo 3D también permiten girarlo para explorar su forma."],
  ["¿Por qué no veo ciertos marcos?", "Puedes explorar los modelos por forma, material y color. Escríbenos si buscas un estilo en particular."],
];

export default function AyudaPage() {
  return (
    <main className="reading-page container-page max-w-3xl py-10 md:py-14">
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
