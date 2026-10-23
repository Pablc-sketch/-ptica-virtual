"use client";
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useState} from 'react';

const CAMPAIGNS=[
 {tag:'Óptica Global',title:'Una mirada.\nTodo tu estilo.',copy:'Marco + cristales básicos con tu receta, desde $28.000.',cta:'Encuentra tu marco',href:'/marcos?categoria=mujer',image:'/img/banner-optico.webp',alt:'Mujer con lentes ópticos junto a una ventana, imagen ambientada',theme:'amber'},
 {tag:'La colección de sol',title:'Días de sol.\nEstilo propio.',copy:'Lentes de sol desde $28.000 el par.',cta:'Ver lentes de sol',href:'/marcos?categoria=sol',image:'/img/banner-sol.webp',alt:'Mujer con lentes de sol leyendo en la playa, imagen ambientada',theme:'sand'},
 {tag:'Tu próximo par',title:'El detalle\nque te distingue.',copy:'Ópticos y de sol, con nombres que viajan contigo.',cta:'Ver la colección',href:'/marcos',image:'/img/banner-color.webp',alt:'Pareja caminando con lentes ópticos y de sol, imagen ambientada',theme:'blue'},
];

// Carrusel con desplazamiento lateral suave: todas las diapositivas viven en una pista que se traslada.
// Se pausa al pasar el cursor, al enfocar con teclado, con la pestaña oculta y con "reducir movimiento".
export function HomeCampaigns(){
 const [index,setIndex]=useState(0),[interacted,setInteracted]=useState(false),[hover,setHover]=useState(false);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(interacted||hover||motion.matches)return;
  const timer=setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%CAMPAIGNS.length);},6500);
  return()=>clearInterval(timer);
 },[interacted,hover]);
 const select=(i:number)=>{setIndex((i+CAMPAIGNS.length)%CAMPAIGNS.length);setInteracted(true);};
 return <section className="campaigns" aria-label="Colecciones de Óptica Global" aria-roledescription="carrusel" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setInteracted(true)}>
  <div className="campaign-viewport">
   <div className="campaign-track" style={{transform:`translateX(-${index*100}%)`}}>
    {CAMPAIGNS.map((s,i)=><div key={s.theme} aria-hidden={i!==index} inert={i!==index} className={`campaign campaign-${s.theme}`} role="group" aria-roledescription="diapositiva" aria-label={`${i+1} de ${CAMPAIGNS.length}`}>
     <div className="campaign-copy"><p className="eyebrow">{s.tag}</p>{i===0?<h1>{s.title}</h1>:<h2>{s.title}</h2>}<p>{s.copy}</p><Link href={s.href} className="btn">{s.cta} <span aria-hidden="true">↗</span></Link></div>
     <div className="campaign-photo"><Image src={s.image} alt={s.alt} fill priority={i===0} sizes="(min-width:768px) 60vw,100vw" className="object-cover"/></div>
    </div>)}
   </div>
  </div>
  <div className="campaign-controls"><button aria-label="Imagen anterior" onClick={()=>select(index-1)}>←</button><div aria-label="Elegir imagen">{CAMPAIGNS.map((s,i)=><button key={s.theme} aria-label={`Ver imagen ${i+1}: ${s.tag}`} aria-pressed={i===index} onClick={()=>select(i)}><span/></button>)}</div><button aria-label="Imagen siguiente" onClick={()=>select(index+1)}>→</button></div>
 </section>;
}
