import Image from "next/image";
import Link from "next/link";
import { FrameOutline } from "@/components/frame-outline";

const STEPS = [
 ["Encuentra tu forma", "Explora los marcos, compara sus medidas y guarda tus favoritos."],
 ["Arma tu selección", "Reúne los que te gustan. Puedes decidir con calma y volver después."],
 ["Hablemos de tu receta", "Una persona revisa lo que necesitas y te explica las opciones de cristales."],
 ["Todo claro, antes de pagar", "Confirma tu cotización completa y coordina la entrega en Santiago."],
];
const SHAPES = [
 {name:"Rectangulares",sub:"Líneas definidas. Actitud propia.",shape:"rectangular" as const},
 {name:"Redondos",sub:"Un clásico con otra mirada.",shape:"round" as const},
 {name:"Cat eye",sub:"Un gesto que cambia todo.",shape:"cat-eye" as const},
];

export default function Home() {
 return <main>
  <div className="container-page hero-shell">
   <section className="home-hero" aria-labelledby="home-title">
    <div className="hero-copy">
     <p className="eyebrow">Óptica Global / Otra forma de mirar</p>
     <h1 id="home-title" className="hero-title">Mírate<br /><em>distinto.</em></h1>
     <p className="hero-description">Hay marcos que te quedan bien.<br />Y otros que se sienten muy tú.<br />Encuentra tu próxima forma de ver.</p>
     <Link href="/marcos" className="btn">Explorar los marcos <span aria-hidden="true">↗</span></Link>
     <p className="hero-bottom">Tu estilo. Tu receta. Tu ritmo.</p>
    </div>
    <figure className="hero-photo">
     <Image src="/editorial/mirada-azul.webp" alt="Retrato editorial conceptual con lentes de acetato marrón sobre fondo azul" width={1254} height={1254} priority sizes="(min-width:768px) 50vw, 100vw" />
     <span className="hero-side-note" aria-hidden="true">GLOBAL / PERSPECTIVAS</span>
     <figcaption>Editorial conceptual · Imagen IA</figcaption>
     <span className="hero-index" aria-hidden="true">01 / 01</span>
    </figure>
   </section>
   <div className="brand-strip" aria-label="Cómo elegir">
    <p><span className="strip-number">01</span>Marcos con medidas claras</p>
    <p><span className="strip-number">02</span>Cristales según tu receta</p>
    <p><span className="strip-number">03</span>Atención de persona a persona</p>
   </div>
  </div>
  <section className="container-page shape-section" aria-labelledby="formas-title">
   <div className="section-intro"><div><p className="eyebrow">Una forma de empezar</p><h2 id="formas-title">Elige por forma.<br />Quédate por cómo te ves.</h2></div><Link href="/marcos" className="arrow-link">Ver catálogo <span aria-hidden="true">↗</span></Link></div>
   <div className="shape-grid">{SHAPES.map(s=><Link href={`/marcos?forma=${s.shape}`} key={s.shape} className="shape-card"><div className="shape-visual"><FrameOutline shape={s.shape} /></div><div className="shape-meta"><div><h3>{s.name}</h3><p>{s.sub}</p></div><span aria-hidden="true">↗</span></div></Link>)}</div>
   <p className="shape-disclaimer">Ilustraciones de formas. La disponibilidad de modelos se muestra en el catálogo.</p>
  </section>
  <section className="container-page" aria-labelledby="detalle-title"><div className="detail-story">
   <figure className="story-photo"><Image src="/estudio/hero-editorial.webp" alt="Estudio conceptual de un marco de acetato, sus curvas y materiales" width={1200} height={1500} sizes="(min-width:768px) 50vw,100vw" /><figcaption>Estudio de material · Imagen conceptual IA</figcaption></figure>
   <div className="story-copy"><p className="eyebrow">Más cerca. Más claro.</p><h2 id="detalle-title">El buen diseño<br />está en los detalles.</h2><p>La curva del puente. La textura del material. Ese pequeño detalle que hace que un marco sea el tuyo.</p><p className="mt-4">Mira las fotografías, compara las medidas y explora cada ángulo cuando el modelo tenga vista 3D disponible.</p><Link href="/marcos" className="arrow-link">Encontrar mi marco <span aria-hidden="true">↗</span></Link></div>
  </div></section>
  <section className="container-page journey-section" aria-labelledby="pasos-title"><div className="section-intro"><div><p className="eyebrow">De tu elección a tu día a día</p><h2 id="pasos-title">Así de personal.<br />Así de simple.</h2></div><Link href="/como-funciona" className="arrow-link">Cómo funciona <span aria-hidden="true">↗</span></Link></div><ol className="journey-grid">{STEPS.map(([title,description],i)=><li key={title}><span className="journey-number">0{i+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
 </main>;
}
