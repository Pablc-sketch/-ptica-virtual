import Image from "next/image";
import Link from "next/link";

const STEPS = [
  ["Encuentra tu marco", "Mira las formas con calma, compara las medidas y guarda los que más te gustan."],
  ["Cuéntanos qué necesitas", "Comparte tu selección y te acompañamos para elegir tus cristales."],
  ["Revisamos tu receta", "Una persona revisa tu receta y te explica las opciones y el valor completo."],
  ["Coordinamos tu entrega", "Cuando confirmes tu cotización, acordamos la entrega dentro de Santiago."],
];

export default function Home() {
  return (
    <>
      <section className="container-page grid items-center gap-10 py-8 md:grid-cols-2 md:py-12">
        <div>
          <p className="eyebrow mb-5">Óptica Global · Una mirada personal</p>
          <h1 className="text-[clamp(54px,7vw,96px)]">
            Tu forma<br />de <em className="text-olive">ver.</em><br /><span className="text-[0.55em]">Tu forma de ser.</span>
          </h1>
          <p className="mt-6 max-w-[36ch] text-base leading-relaxed text-muted">
            Lentes que se sienten tuyos. Elige con calma, conoce cada detalle y déjanos acompañarte con tu receta.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/marcos" className="btn">
              Explorar los marcos ↗
            </Link>
            <Link href="/como-funciona" className="btn btn-ghost">
              Cómo funciona
            </Link>
          </div>
        </div>
        <figure className="relative overflow-hidden rounded-t-[48%] bg-sage">
          <Image
            src="/estudio/hero-editorial.webp"
            alt="Composición conceptual de un marco de acetato oliva sobre piedra caliza"
            width={1200}
            height={1500}
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="aspect-[4/5] w-full object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/45 to-transparent px-4 pb-3 pt-10 text-[11px] tracking-[0.12em] text-paper">
            <span>IMAGEN CONCEPTUAL · IA</span>
            <span>Estudio de forma / 01</span>
          </figcaption>
        </figure>
      </section>

      <section className="container-page grid gap-8 border-t border-line py-14 md:grid-cols-3">
        <div>
          <h2 className="text-3xl">El detalle importa.</h2>
          <p className="mt-3 text-muted">
            Fotografías claras y el código de cada modelo para que sepas exactamente qué estás eligiendo.
          </p>
        </div>
        <div>
          <h2 className="text-3xl">Míralos de cerca.</h2>
          <p className="mt-3 text-muted">
            Explora la forma desde distintos ángulos en los marcos con vista 3D disponible. Compara sus medidas con tus lentes actuales.
          </p>
        </div>
        <div>
          <h2 className="text-3xl">Todo claro, contigo.</h2>
          <p className="mt-3 text-muted">
            El marco, los cristales y la entrega se detallan por separado. Conoce el valor completo antes de pagar.
          </p>
        </div>
      </section>

      <section className="container-page border-t border-line py-14">
        <h2 className="mb-8 text-4xl">Cómo funciona</h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t border-ink pt-4">
              <span className="eyebrow">Paso {i + 1}</span>
              <h3 className="mt-2 text-xl">{t}</h3>
              <p className="mt-2 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
