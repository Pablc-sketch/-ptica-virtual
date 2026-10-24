import Image from 'next/image';
import Link from 'next/link';
import {Suspense} from 'react';
import {HomeCampaigns} from '@/components/home-campaigns';
import {ProductRail} from '@/components/product-rail';
import {ProductCard} from '@/components/product-card';
import {getPublishedProducts} from '@/lib/catalog';
import {LENS_OPTIONS} from '@/lib/lens-options';
import {clp} from '@/lib/format';

const CATEGORIES=[
 {name:'Ópticos mujer',detail:'Tu marco, con los cristales de tu receta',href:'/marcos?categoria=mujer',image:'/img/cat-mujer.webp'},
 {name:'Ópticos hombre',detail:'Diseños para preparar con tu receta',href:'/marcos?categoria=hombre',image:'/img/cat-hombre.webp'},
 {name:'Lentes de sol',detail:'Cristales de sol, sin aumento',href:'/marcos?categoria=sol',image:'/img/cat-sol.webp'},
 {name:'Lentes para pantallas',detail:'Filtro azul · Sin aumento · Desde $38.000',href:'/sin-aumento',image:'/img/cat-filtro-azul.webp'},
];
const LENS_IMAGES=['/img/cristal-basico.webp','/img/cristal-antirreflejo.webp','/img/cristal-filtro-azul.webp'];
const LENS_DETAIL=['Cristal transparente para el día a día.','Menos reflejos en la cara y en las pantallas.','Filtra parte de la luz azul de las pantallas.'];
const GUIDE=[
 {id:'envios',title:'Envíos',text:'Cómo coordinamos el despacho de tus lentes a tu dirección.'},
 {id:'dp',title:'¿Qué es la DP?',text:'La distancia pupilar: qué es y por qué importa en tus lentes.'},
 {id:'receta',title:'Cómo leer tu receta',text:'ESF, CIL, EJE y ADD explicados en simple.'},
 {id:'enviar-receta',title:'Cómo enviar tu receta',text:'Súbela de forma privada desde tu cuenta o escríbenos.'},
];

async function Products(){
 let products;
 try{products=await getPublishedProducts();}catch{return <p className="text-muted" role="status">No pudimos cargar los marcos en este momento.</p>;}
 if(!products.length)return null;
 // Llegan del más nuevo al más antiguo: los 4 primeros son "recién llegados"; con catálogo suficiente, el carrusel no los repite.
 const newest=products.slice(0,4), rail=products.length>8?products.slice(4):products;
 return <>
  <section className="container-page home-rail-section" aria-labelledby="favoritos-title">
   <div className="section-intro"><div><p className="eyebrow">Elegidos por el equipo</p><h2 id="favoritos-title">Favoritos de la casa.</h2></div><Link href="/marcos" className="arrow-link">Todos los marcos ↗</Link></div>
   <ProductRail products={rail} label="Favoritos de la casa"/>
  </section>
  <section className="container-page home-rail-section" aria-labelledby="nuevos-title">
   <div className="section-intro"><div><p className="eyebrow">Recién llegados</p><h2 id="nuevos-title">Lo nuevo en la tienda.</h2></div></div>
   <div className="new-arrivals">{newest.map(p=><ProductCard key={p.id} p={p}/>)}</div>
  </section>
 </>;
}

export default function Home(){return <main>
 <HomeCampaigns/>
 <div className="store-benefits container-page"><span>✓ Revisión por profesionales</span><span>✓ Pruébalos en tus fotos</span><a href="https://wa.me/56975512281">✓ Atención por WhatsApp</a></div>
 <section className="container-page discovery-section" aria-labelledby="estilos-title"><div className="section-intro"><div><p className="eyebrow">Encuentra tu estilo</p><h2 id="estilos-title">Tus próximos favoritos.</h2></div></div><div className="discovery-grid">{CATEGORIES.map(c=><Link href={c.href} className="discovery-card" key={c.name}><div><Image src={c.image} alt="" fill sizes="(min-width:768px) 25vw,50vw"/></div><h3>{c.name}<span aria-hidden="true">↗</span></h3><p>{c.detail}</p></Link>)}</div></section>
 <Suspense fallback={<p className="container-page text-muted" role="status">Cargando marcos…</p>}><Products/></Suspense>
 <section className="container-page collections-section" aria-labelledby="colecciones-title">
  <div className="section-intro"><div><p className="eyebrow">Colecciones destacadas</p><h2 id="colecciones-title">Historias para mirar.</h2></div></div>
  <div className="collections-grid">
   <Link href="/marcos?categoria=mujer" className="collection-card collection-art"><div className="collection-media"><Image src="/img/col-arte.webp" alt="Marco de carey sobre una escultura, imagen ambientada" fill sizes="(min-width:768px) 33vw,100vw" className="object-cover"/></div><footer><p className="eyebrow">Colección Galería</p><h3>Color con firma propia.</h3></footer></Link>
   <Link href="/marcos?uso=solar" className="collection-card collection-split"><div className="collection-media split"><div><Image src="/img/col-verano-optico.webp" alt="Persona con lentes ópticos en verano, imagen ambientada" fill sizes="(min-width:768px) 17vw,50vw" className="object-cover"/></div><div><Image src="/img/col-verano-sol.webp" alt="Persona con lentes de sol en verano, imagen ambientada" fill sizes="(min-width:768px) 17vw,50vw" className="object-cover"/></div></div><footer><p className="eyebrow">Colección de verano</p><h3>Ópticos y de sol.</h3></footer></Link>
   <Link href="/marcos" className="collection-card collection-essentials"><div className="collection-media"><Image src="/img/col-esenciales.webp" alt="Cuatro marcos sobre lino, imagen ambientada" fill sizes="(min-width:768px) 33vw,100vw" className="object-cover"/></div><footer><p className="eyebrow">Esenciales</p><h3>Líneas suaves para todos los días.</h3></footer></Link>
  </div>
 </section>
 <section className="container-page price-section" aria-labelledby="precios-title"><div className="section-intro"><div><p className="eyebrow">Cristales con receta</p><h2 id="precios-title">Tu par, a tu manera.</h2></div><Link href="/cristales" className="arrow-link">Explorar tratamientos ↗</Link></div><div className="home-price-grid">{LENS_OPTIONS.map((o,i)=><Link href="/configurar" key={o.id} className="home-price-option"><div className="lens-photo"><Image src={LENS_IMAGES[i]??LENS_IMAGES[0]} alt="" fill sizes="(min-width:768px) 30vw,100vw" className="object-cover"/></div><span className="eyebrow">Marco y cristales con receta desde</span><strong>{clp(o.fromClp)}</strong><span>{o.name}<span aria-hidden="true">↗</span></span><p className="text-sm text-muted">{LENS_DETAIL[i]??o.note}</p></Link>)}</div><p className="price-footnote">El precio final depende del marco y de tu graduación. Lo confirmamos al revisar tu receta.</p><Link href="/sin-aumento" className="arrow-link mt-4">¿Sin aumento? Descubre los lentes para pantallas desde $38.000 →</Link></section>
 <section className="container-page guide-section" aria-labelledby="guia-title"><div className="section-intro"><div><p className="eyebrow">Tu primera compra</p><h2 id="guia-title">Guía para tu primera compra.</h2></div><Link href="/guia" className="arrow-link">Ver la guía ↗</Link></div><ol className="guide-grid">{GUIDE.map((g,i)=><li key={g.id}><Link href={`/guia#${g.id}`}><span className="journey-num">0{i+1}</span><h3>{g.title}</h3><p>{g.text}</p></Link></li>)}</ol></section>
 </main>;}
