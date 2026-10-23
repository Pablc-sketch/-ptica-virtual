import Image from 'next/image';
import Link from 'next/link';
import {Suspense} from 'react';
import {getPublishedProducts} from '@/lib/catalog';
import {frameDesign} from '@/lib/frame-design';
import {clp} from '@/lib/format';
export const metadata={title:'Filtro azul sin aumento',description:'Elige tu marco con cristales de filtro azul sin graduación.'};
async function Frames(){
 let products;
 try{products=await getPublishedProducts();}catch{return <p role="alert">No pudimos cargar los marcos. <Link href="/sin-aumento">Reintentar</Link></p>;}
 const frames=products.filter(p=>frameDesign(p.slug)?.use==='optical');
 return <div className="discovery-grid">{frames.map(p=><article key={p.id} className="discovery-card"><div><Image src={p.images[0].url} alt={p.name} fill sizes="(min-width:768px) 25vw,50vw"/></div><h2 className="mt-4 text-xl">{p.name}</h2><p>{p.color}</p><p className="mt-4 text-lg">{p.pairBasePriceClp?`Desde ${clp(p.pairBasePriceClp+20000)}`:'Consultar precio'}</p><p>Marco + filtro azul sin aumento.</p><Link className="btn mt-4" href={'https://wa.me/56975512281?text='+encodeURIComponent(`Hola, quisiera consultar disponibilidad de ${p.name} (${p.slug}), color ${p.color??'de la foto'}, con filtro azul SIN AUMENTO (0.00).`)}>Consultar este par ↗</Link><Link className="arrow-link mt-3" href={`/marcos/${p.slug}`}>Ver el marco →</Link></article>)}</div>;
}
export default function Page(){return <main className="container-page py-10"><p className="eyebrow">Con tu estilo. Sin graduación.</p><h1 className="text-4xl mt-4">Filtro azul sin aumento.</h1><p className="mt-4 mb-8 max-w-xl">Elige el marco que te gusta. Para un par sin aumento no necesitas completar una receta. Consulta disponibilidad con nuestro equipo por WhatsApp.</p><Suspense fallback={<p role="status">Cargando marcos…</p>}><Frames/></Suspense></main>;}
