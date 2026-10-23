"use client";
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useState} from 'react';

const CAMPAIGNS=[
 {tag:'Óptica Global',title:'Una mirada.\nTodo tu estilo.',copy:'Marco + cristales básicos con tu receta, desde $28.000.',cta:'Encuentra tu marco',href:'/marcos?uso=optical',image:'/products/ambar.webp',alt:'Riviera, marco agatado negro y ámbar',theme:'amber'},
 {tag:'La colección de sol',title:'Días de sol.\nEstilo propio.',copy:'Descubre Soho: líneas suaves y negro esencial.',cta:'Ver lentes de sol',href:'/marcos?uso=solar',image:'/products/soho-ambiente.webp',alt:'Soho sobre lino junto al mar, imagen ambientada',theme:'sand'},
 {tag:'Tu próximo par',title:'El detalle\nque te distingue.',copy:'Brera. Una mirada al color, en mosaico azul.',cta:'Descubrir Brera',href:'/marcos/cat-eye-mosaico',image:'/products/mosaico.webp',alt:'Brera, marco agatado con mosaico azul',theme:'blue'},
];

export function HomeCampaigns(){
 const [index,setIndex]=useState(0),[interacted,setInteracted]=useState(false),[hover,setHover]=useState(false);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(interacted||hover||motion.matches)return;
  const timer=setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%CAMPAIGNS.length);},6500);
  const stop=()=>{if(motion.matches)clearInterval(timer);};motion.addEventListener('change',stop);
  return()=>{clearInterval(timer);motion.removeEventListener('change',stop);};
 },[interacted,hover]);
 const select=(i:number)=>{setIndex((i+CAMPAIGNS.length)%CAMPAIGNS.length);setInteracted(true);};
 return <section className="campaigns" aria-label="Colecciones de Óptica Global" aria-roledescription="carrusel" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setInteracted(true)}>
  {CAMPAIGNS.map((s,i)=><div key={s.theme} hidden={i!==index} className={`campaign campaign-${s.theme}`} role="group" aria-roledescription="diapositiva" aria-label={`${i+1} de 3`}>
   <div className="campaign-copy"><p className="eyebrow">{s.tag}</p><h1>{s.title}</h1><p>{s.copy}</p><Link href={s.href} className="btn">{s.cta} <span aria-hidden="true">↗</span></Link></div>
   <div className="campaign-photo"><Image src={s.image} alt={s.alt} fill priority={i===0} sizes="(min-width:768px) 60vw,100vw" className="object-cover"/></div>
  </div>)}
  <div className="campaign-controls"><button aria-label="Imagen anterior" onClick={()=>select(index-1)}>←</button><div aria-label="Elegir imagen">{CAMPAIGNS.map((s,i)=><button key={s.theme} aria-label={`Ver imagen ${i+1}: ${s.tag}`} aria-pressed={i===index} onClick={()=>select(i)}><span/></button>)}</div><button aria-label="Imagen siguiente" onClick={()=>select(index+1)}>→</button></div>
 </section>;
}
