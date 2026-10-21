import Link from "next/link";
import { FrameOutline } from "@/components/frame-outline";
import { FrameExplorer } from "@/components/frame-explorer";

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
     <p className="eyebrow">Óptica Global / Santiago</p>
     <h1 id="home-title" className="hero-title">Visión sin<br /><em>fronteras.</em></h1>
     <p className="hero-description">Tu próximo marco merece una buena elección. Explora las formas, compara medidas y guarda los que van contigo.</p>
     <Link href="/marcos" className="btn">Explorar los marcos <span aria-hidden="true">↗</span></Link>
     <p className="hero-bottom">Marcos, cristales y atención personal.</p>
    </div>
    <FrameExplorer />
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
   <div className="measure-visual"><FrameOutline /><p className="measure-sample" aria-label="Ejemplo de medidas: lente52, puente18 y varilla140 milímetros"><span>52</span><small aria-hidden="true">□</small><span>18</span><small aria-hidden="true">—</small><span>140</span></p><div className="measure-legend"><span>Lente</span><span>Puente</span><span>Varilla</span></div><p className="illustration-note">Ejemplo ilustrativo en milímetros. No corresponde a un producto.</p></div>
   <div className="story-copy"><p className="eyebrow">Más información. Mejor elección.</p><h2 id="detalle-title">Que se vean bien.<br />Y que sean tuyos.</h2><p>Una forma práctica de empezar: compara las medidas publicadas con las de tus lentes actuales. En el comparador puedes revisar hasta tres marcos lado a lado.</p><p className="mt-4">Si una medida no está informada, te lo mostramos así. La elección del ajuste se revisa contigo.</p><Link href="/comparar" className="arrow-link">Ir al comparador <span aria-hidden="true">↗</span></Link></div>
  </div></section>
  <section className="container-page journey-section" aria-labelledby="pasos-title"><div className="section-intro"><div><p className="eyebrow">De tu elección a tu día a día</p><h2 id="pasos-title">Así de personal.<br />Así de simple.</h2></div><Link href="/como-funciona" className="arrow-link">Cómo funciona <span aria-hidden="true">↗</span></Link></div><ol className="journey-grid">{STEPS.map(([title,description],i)=><li key={title}><span className="journey-number">0{i+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
 </main>;
}
