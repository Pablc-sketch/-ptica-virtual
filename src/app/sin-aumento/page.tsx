import Image from 'next/image';
import Link from 'next/link';
import {Suspense} from 'react';
import {getPublishedProducts} from '@/lib/catalog';
import {CatalogClient} from '@/components/catalog-client';
import {clp} from '@/lib/format';
import {SCREEN_LENSES} from '@/lib/screen-lenses';
export const metadata={title:'Lentes para pantallas · Sin aumento',description:'Tu estilo también frente a la pantalla. Marco + cristales con filtro de luz azul sin aumento, desde $38.000. Elige tu marco sin enviar receta.'};
async function Frames(){
 let products;
 try{products=await getPublishedProducts();}catch{return <p role="alert">No pudimos cargar los marcos. <Link href="/sin-aumento">Reintentar</Link></p>;}
 return <CatalogClient products={products} screen/>;
}
export default function Page(){return <main className="container-page py-10">
 <section className="screen-hero" aria-labelledby="screen-title">
  <div className="screen-hero-copy"><p className="eyebrow">Lentes para pantallas · Sin aumento</p>
   <h1 id="screen-title">Tu estilo también<br/>frente a la pantalla.</h1>
   <p>Para trabajar, estudiar o disfrutar de tus contenidos. Elige un marco que vaya contigo y combínalo con cristales transparentes con filtro de luz azul, sin graduación.</p>
   <p className="screen-hero-price"><span>El par completo desde</span><strong>{clp(SCREEN_LENSES.fromClp)}</strong></p>
   <p>Marco + cristales con filtro azul · 0.00 de aumento · Sin enviar receta.</p>
   <a href="#elige-tu-marco" className="btn mt-5">Encuentra tu estilo ↓</a>
  </div>
  <div className="screen-hero-photo"><Image src="/img/cat-filtro-azul.webp" alt="Estilo para tus horas de pantalla, imagen ambientada" fill priority sizes="(min-width:768px) 45vw,100vw" className="object-cover"/></div>
 </section>
 <section id="elige-tu-marco" className="screen-collection" aria-labelledby="screen-frames-title"><p className="eyebrow">Un par que va contigo</p><h2 id="screen-frames-title" className="text-3xl mt-3 mb-5">Elige el tuyo.</h2>
  <Suspense fallback={<p role="status">Cargando marcos…</p>}><Frames/></Suspense>
 </section>
 <section className="screen-prescription-note"><h2 className="text-2xl">¿Ya usas lentes con aumento?</h2><p>También puedes elegir filtro azul con tu receta. Tenemos opciones para preparar tus cristales según tu graduación.</p><Link href="/marcos" className="arrow-link">Ver lentes con receta →</Link></section>
</main>;}
