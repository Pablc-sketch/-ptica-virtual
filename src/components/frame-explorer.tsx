"use client";
import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
export type FeaturedFrame={name:string;slug:string;shape:string;image:string;sample:boolean};
export function FrameExplorer({frames}:{frames:FeaturedFrame[]}){
 const [index,setIndex]=useState(0),selected=frames[index]??frames[0];
 if(!selected)return <div className="frame-explorer"><p>Explora las opciones de cristales y envíanos tu receta.</p><Link href="/configurar" className="arrow-link mt-8">Configurar mis lentes →</Link></div>;
 return <div className="frame-explorer actual-frames"><div className="explorer-label"><span>LA COLECCIÓN</span><span>{String(index+1).padStart(2,'0')} / {String(frames.length).padStart(2,'0')}</span></div><figure className="frame-stage"><Link href={`/marcos/${selected.slug}`} className="featured-photo"><Image src={selected.image} alt={`Marco ${selected.name}`} width={1440} height={1080} sizes="(min-width:1024px) 600px,100vw" priority className="object-contain"/></Link><figcaption aria-live="polite"><strong>{selected.name}</strong><span>{selected.shape}</span></figcaption></figure><div className="explorer-options" role="group" aria-label="Marcos de la colección">{frames.map((f,i)=><button type="button" key={f.slug} aria-pressed={i===index} onClick={()=>setIndex(i)}>{f.name}</button>)}</div><div className="explorer-bottom"><Link href={`/cotizar-receta?marco=${selected.slug}`} className="arrow-link">Elegir cristales <span aria-hidden="true">→</span></Link>{selected.sample&&<p>Imagen retocada.<br/>Disponibilidad por confirmar.</p>}</div></div>;
}
