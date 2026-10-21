import Image from "next/image";
import Link from "next/link";

const STEPS = [
  ["Elige tus marcos", "Explora el catálogo, guarda favoritos y arma una selección de hasta 10 marcos."],
  ["Pide tu cotización", "Envías tu selección y tus datos de contacto. El total del marco lo calcula el servidor."],
  ["Revisamos tu receta", "Los cristales dependen de tu receta. La revisamos contigo antes de confirmar cualquier total."],
  ["Confirmas y retiras", "No hay compra sin revisión de receta ni confirmación del total."],
];

export default function Home() {
  return (
    <>
      <section className="container-page grid items-center gap-10 py-10 md:grid-cols-2 md:py-20">
        <div>
          <p className="eyebrow mb-4">Óptica online · marcos de autor</p>
          <h1 className="text-[clamp(44px,7vw,96px)]">
            Marcos con <em className="not-italic text-olive">criterio</em>, vistos de cerca.
          </h1>
          <p className="mt-6 max-w-[48ch] text-lg text-muted">
            Fotografías reales de cada modelo, medidas completas y, cuando existe, un modelo 3D
            verificado. Sin sorpresas: el valor del marco va separado de los cristales.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/marcos" className="btn">
              Ver marcos
            </Link>
            <Link href="/como-funciona" className="btn btn-ghost">
              Cómo funciona
            </Link>
          </div>
        </div>
        <figure className="relative overflow-hidden bg-sage">
          <Image
            src="/estudio/hero-editorial.webp"
            alt="Composición conceptual de un marco de acetato oliva sobre piedra caliza"
            width={1200}
            height={1200}
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="aspect-[4/5] w-full object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/45 to-transparent px-4 pb-3 pt-10 text-[11px] tracking-[0.12em] text-paper">
            <span>IMAGEN CONCEPTUAL · IA</span>
            <span>No corresponde a un producto</span>
          </figcaption>
        </figure>
      </section>

      <section className="container-page grid gap-8 border-t border-line py-14 md:grid-cols-3">
        <div>
          <h2 className="text-3xl">Fotos reales</h2>
          <p className="mt-3 text-muted">
            Solo publicamos un marco cuando tiene una fotografía real verificada, su precio confirmado y
            sus medidas.
          </p>
        </div>
        <div>
          <h2 className="text-3xl">3D cuando es 3D</h2>
          <p className="mt-3 text-muted">
            La vista 3D se carga al pedirla y solo existe si hay un modelo GLB verificado. Nunca es una
            foto girando.
          </p>
        </div>
        <div>
          <h2 className="text-3xl">Marco y cristales</h2>
          <p className="mt-3 text-muted">
            El precio que ves es del marco. Los cristales se definen con tu receta, con revisión previa.
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
