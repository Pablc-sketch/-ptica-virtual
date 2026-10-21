"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useComparison, toggleComparison, clearComparison } from "@/lib/compare-store";
import { productPrice } from "@/lib/product-price";
import type { CatalogProduct } from "@/lib/catalog-types";
import { SelectionButtons } from "@/components/selection-button";
import { FrameOutline } from "@/components/frame-outline";

const mm = (value: number | null) => value == null ? "Sin informar" : `${value} mm`;
const ROWS: [string,(p:CatalogProduct)=>string][] = [
  ["Precio de referencia",p=>`${productPrice(p).text} ${productPrice(p).label}`.trim()],
  ["Forma",p=>p.frameShape ?? "Sin informar"], ["Material",p=>p.material ?? "Sin informar"],
  ["Color",p=>p.color ?? "Sin informar"], ["Ancho del lente",p=>mm(p.lensWidthMm)],
  ["Puente",p=>mm(p.bridgeMm)], ["Varilla",p=>mm(p.templeMm)],
  ["Vista 3D",p=>p.modelUrl ? "Disponible en la ficha" : "No disponible"],
];

export function CompareWorkspace() {
  const ids = useComparison();
  const key=ids.join(",");
  const [retry,setRetry]=useState(0);
  const requestKey=`${key}:${retry}`;
  const [response,setResponse]=useState<{key:string; products:CatalogProduct[]; error:boolean}>({key:"",products:[],error:false});
  useEffect(()=>{
    if (!key) return;
    const controller=new AbortController();
    fetch(`/api/comparar?ids=${encodeURIComponent(key)}`,{cache:"no-store",signal:controller.signal})
      .then(async result=>{if(!result.ok)throw new Error("comparison_unavailable");return result.json() as Promise<CatalogProduct[]>;})
      .then(products=>{if(!controller.signal.aborted)setResponse({key:requestKey,products,error:false});})
      .catch(()=>{if(!controller.signal.aborted)setResponse({key:requestKey,products:[],error:true});});
    return ()=>controller.abort();
  },[key,requestKey]);
  if(ids.length && response.key!==requestKey) return <p role="status" className="comparison-loading">Consultando precios, fotos y medidas actuales…</p>;
  if(ids.length && response.error) return <div role="alert" className="catalog-empty"><div><h2>No pudimos cargar la comparación</h2><p>Tu lista sigue guardada. Puedes reintentar sin volver a elegir los marcos.</p><button type="button" className="btn" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></div></div>;
  const products=response.products;
  const selected = ids.flatMap(id => { const p=products.find(p=>p.id===id); return p ? [p] : []; });
  if (!selected.length) return <div className="catalog-empty"><div><p className="eyebrow">Un poco más de perspectiva</p><h2>Elige hasta tres.<br/>Compara con calma.</h2><p>{ids.length ? "Los marcos que guardaste ya no están publicados. Puedes iniciar una nueva comparación." : "En el catálogo, pulsa Comparar marco en los modelos que quieras revisar. Sus medidas, materiales y precios aparecerán aquí."}</p><Link href="/marcos" className="btn">Elegir marcos <span aria-hidden="true">↗</span></Link>{ids.length>0 && <button type="button" className="ml-4 underline text-sm" onClick={clearComparison}>Vaciar comparador</button>}</div><div><FrameOutline/><p className="!text-[10px] text-center">Ilustración de forma</p></div></div>;
  return <>
    {selected.length<ids.length && <p role="status" className="mb-4 text-sm text-muted">Algunos marcos guardados ya no están publicados. Solo mostramos los disponibles en el catálogo actual. <button type="button" className="underline" onClick={clearComparison}>Reiniciar comparación</button></p>}
    <div className="compare-toolbar"><p>{selected.length} {selected.length===1 ? "marco elegido" : "marcos elegidos"} · hasta 3</p><Link href="/marcos" className="arrow-link">{selected.length<3 ? "Agregar otro marco" : "Volver al catálogo"}<span aria-hidden="true">↗</span></Link></div>
    <div className="compare-scroll" role="region" aria-label="Tabla de comparación de marcos; puedes desplazarla horizontalmente" tabIndex={0}>
      <table className="compare-table"><caption className="sr-only">Comparación de precios, materiales y medidas reales de los marcos elegidos</caption><thead><tr><th scope="col"><span className="eyebrow">Lado a lado</span><p className="mt-3 text-xl">Encuentra<br/>la diferencia.</p></th>{selected.map(p=><th key={p.id} scope="col"><Link href={`/marcos/${p.slug}`} className="compare-product"><span className="compare-image"><Image src={p.images[0].url} alt={p.images[0].alt} fill sizes="200px" className="object-contain"/></span><span>{p.name}</span></Link><button type="button" onClick={()=>toggleComparison(p.id)} className="compare-remove" aria-label={`Quitar ${p.name} del comparador`}>Quitar</button></th>)}</tr></thead><tbody>{ROWS.map(([label,get])=><tr key={label}><th scope="row">{label}</th>{selected.map(p=><td key={p.id}>{get(p)}</td>)}</tr>)}<tr><th scope="row">Tu elección</th>{selected.map(p=><td key={p.id}><SelectionButtons id={p.id}/></td>)}</tr></tbody></table>
    </div>
    <p className="mt-5 max-w-2xl text-sm text-muted">Cada precio indica si incluye cristal blanco o solo marco. La graduación, otros tratamientos y el despacho se confirman al cotizar. Las medidas orientan; no garantizan el ajuste.</p>
  </>;
}
