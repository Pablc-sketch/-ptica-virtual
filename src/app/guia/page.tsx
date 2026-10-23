import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Guía para tu primera compra", description: "Envíos, distancia pupilar, cómo leer tu receta y cómo enviarla." };

export default function GuiaPage() {
  return (
    <main className="container-page max-w-3xl py-10 md:py-14">
      <p className="eyebrow">Tu primera compra</p>
      <h1 className="mb-8 text-[clamp(36px,5vw,64px)]">Guía para tu primera compra</h1>

      <section id="envios" className="guide-article">
        <h2>Envíos</h2>
        <p>Cuando confirmas tu pedido coordinamos el despacho a la dirección que indiques en tu cuenta. Antes de pagar verás el costo y el plazo de envío de tu dirección; tus lentes se preparan después de revisar tu receta.</p>
      </section>

      <section id="dp" className="guide-article">
        <h2>¿Qué es la DP?</h2>
        <p>La <strong>distancia pupilar (DP)</strong> es la distancia, en milímetros, entre el centro de tus pupilas. Sirve para que el centro óptico de cada cristal quede frente a tu ojo. A veces viene en la receta como un solo número (por ejemplo 62) o separada por ojo, llamada DP monocular (por ejemplo 31 / 31).</p>
        <p>Si tu receta no la trae, te ayudamos a obtenerla. Para lentes bifocales o multifocales se necesita una medición profesional con el marco ajustado: no se puede medir con una selfie.</p>
      </section>

      <section id="receta" className="guide-article">
        <h2>Cómo leer tu receta</h2>
        <p>Tu receta tiene una fila para cada ojo: <strong>OD</strong> (ojo derecho) y <strong>OI</strong> (ojo izquierdo).</p>
        <dl className="guide-terms">
          <div><dt>ESF (esfera)</dt><dd>Corrige la miopía (valores con signo −) o la hipermetropía (signo +).</dd></div>
          <div><dt>CIL (cilindro)</dt><dd>Corrige el astigmatismo. Puede venir vacío si no tienes.</dd></div>
          <div><dt>EJE</dt><dd>La orientación del cilindro, de 0 a 180 grados. Solo aparece si hay cilindro.</dd></div>
          <div><dt>ADD (adición)</dt><dd>La graduación extra para ver de cerca, usada en lentes bifocales o multifocales.</dd></div>
        </dl>
        <p className="text-sm text-muted">Esta guía te ayuda a entender tu receta; no reemplaza la indicación de tu profesional de la visión. Siempre revisamos tu receta antes de preparar tus lentes.</p>
      </section>

      <section id="enviar-receta" className="guide-article">
        <h2>Cómo enviar tu receta</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Ingresa o crea tu cuenta en <Link href="/mi-cuenta" className="underline">Mi cuenta</Link>.</li>
          <li>Toma una foto clara de la receta completa, sin reflejos, o súbela en PDF.</li>
          <li>Revisa la vista previa y autoriza la revisión. La receta queda privada: solo tú y el equipo autorizado pueden verla.</li>
        </ol>
        <p>¿Dudas? <a href="https://wa.me/56975512281" className="underline">Escríbenos por WhatsApp</a>.</p>
      </section>
    </main>
  );
}
