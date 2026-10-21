"use client";
import Link from "next/link";
import { useState } from "react";
import { FrameOutline } from "@/components/frame-outline";

const SHAPES = [
  {id:"rectangular", label:"Rectangular", note:"Líneas definidas", query:"rectangular"},
  {id:"round", label:"Redondo", note:"Curvas suaves", query:"round"},
  {id:"cat-eye", label:"Cat eye", note:"Ángulos que se hacen notar", query:"cat-eye"},
] as const;

export function FrameExplorer() {
  const [index,setIndex] = useState(0);
  const selected = SHAPES[index];
  return <div className="frame-explorer">
    <div className="explorer-label"><span>EL PUNTO DE PARTIDA</span><span aria-hidden="true">0{index+1} / 03</span></div>
    <figure className="frame-stage">
      <div className="explorer-drawing"><FrameOutline shape={selected.id}/></div>
      <figcaption aria-live="polite"><strong>{selected.label}</strong><span>{selected.note}</span></figcaption>
    </figure>
    <div className="explorer-options" role="group" aria-label="Explorar formas de marcos">{SHAPES.map((s,i)=><button key={s.id} type="button" aria-pressed={i===index} onClick={()=>setIndex(i)}>{s.label}</button>)}</div>
    <div className="explorer-bottom"><Link href={`/marcos?forma=${selected.query}`} className="arrow-link">Ver esta forma <span aria-hidden="true">↗</span></Link><p>Ilustraciones de siluetas.<br/>La disponibilidad está en el catálogo.</p></div>
  </div>;
}
