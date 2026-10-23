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
 {name:'Mujer',detail:'Lentes ópticos con carácter',href:'/marcos?genero=mujer',image:'/products/ambar.webp'},
 {name:'Hombre',detail:'Lentes ópticos esenciales',href:'/marcos?genero=hombre',image:'/products/ovalo.webp'},
 {name:'Lentes de sol',detail:'Tu par para el verano',href:'/marcos?uso=solar',image:'/products/soho-ambiente.webp'},
 {name:'Filtro de luz azul',detail:'Para tus horas de pantalla',href:'/sin-aumento',image:'/products/mosaico.webp'},
];
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
 return <>
  <section className="container-page home-rail-section" aria-labelledby="favoritos-title">
   <div className="section-intro"><div><p className="eyebrow">Elegidos por el equipo</p><h2 id="favoritos-title">Favoritos de la casa.</h2></div><Link href="/marcos" className="arrow-link">Todos los marcos ↗</Link></div>
   <ProductRail products={products} label="Favoritos de la casa"/>
  </section>
  <section className="container-page home-rail-section" aria-labelledby="nuevos-title">
   <div className="section-intro"><div><p className="eyebrow">Recién llegados</p><h2 id="nuevos-title">Lo nuevo en la tienda.</h2></div></div>
   <div className="new-arrivals">{products.slice(0,4).map(p=><ProductCard key={p.id} p={p}/>)}</div>
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
   <Link href="/marcos/cat-eye-mosaico" className="collection-card collection-art"><div className="collection-media"><Image src="/products/mosaico.webp" alt="Brera, marco agatado con mosaico azul" fill sizes="(min-width:768px) 33vw,100vw" className="object-contain"/></div><footer><p className="eyebrow">Colección Brera</p><h3>Color con firma propia.</h3></footer></Link>
   <Link href="/marcos?uso=solar" className="collection-card collection-split"><div className="collection-media split"><div><Image src="/products/ambar.webp" alt="Lentes ópticos de la colección de verano" fill sizes="(min-width:768px) 17vw,50vw" className="object-cover"/></div><div><Image src="/products/soho-ambiente.webp" alt="Lentes de sol de la colección de verano, imagen ambientada" fill sizes="(min-width:768px) 17vw,50vw" className="object-cover"/></div></div><footer><p className="eyebrow">Colección de verano</p><h3>Ópticos y de sol.</h3></footer></Link>
   <Link href="/marcos?forma=oval" className="collection-card collection-essentials"><div className="collection-media"><Image src="/products/ovalo.webp" alt="Marco ovalado de la colección Esenciales" fill sizes="(min-width:768px) 33vw,100vw" className="object-contain"/></div><footer><p className="eyebrow">Esenciales</p><h3>Líneas suaves para todos los días.</h3></footer></Link>
  </div>
 </section>
 <section className="container-page price-section" aria-labelledby="precios-title"><div className="section-intro"><div><p className="eyebrow">Elige tus cristales</p><h2 id="precios-title">Tu par, a tu manera.</h2></div><Link href="/cristales" className="arrow-link">Explorar tratamientos ↗</Link></div><div className="home-price-grid">{LENS_OPTIONS.map((o,i)=><Link href="/configurar" key={o.id} className="home-price-option"><div className={`lens-demo ${i===0?'clear':i===1?'ar':'blue'}`} aria-hidden="true"><span className="lens-demo-glass"/><span className="lens-demo-glare"/></div><span className="eyebrow">Marco y cristales desde</span><strong>{clp(o.fromClp)}</strong><span>{o.name}<span aria-hidden="true">↗</span></span><p className="text-sm text-muted">{LENS_DETAIL[i]??o.note}</p></Link>)}</div><p className="price-footnote">El precio final depende del marco y de tu graduación. Lo confirmamos al revisar tu receta.</p></section>
 <section className="container-page guide-section" aria-labelledby="guia-title"><div className="section-intro"><div><p className="eyebrow">Tu primera compra</p><h2 id="guia-title">Guía para tu primera compra.</h2></div><Link href="/guia" className="arrow-link">Ver la guía ↗</Link></div><ol className="guide-grid">{GUIDE.map((g,i)=><li key={g.id}><Link href={`/guia#${g.id}`}><span className="journey-num">0{i+1}</span><h3>{g.title}</h3><p>{g.text}</p></Link></li>)}</ol></section>
 </main>;}
