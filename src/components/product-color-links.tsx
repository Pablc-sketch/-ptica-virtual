"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
export function ProductColorLinks({slug,initialColor,variantIds}:{slug:string;initialColor?:string;variantIds:string[]}){
 const [color,setColor]=useState(initialColor);
 useEffect(()=>{const update=(event:Event)=>{const d=(event as CustomEvent<{slug:string;color:string}>).detail;if(d?.slug===slug&&variantIds.includes(d.color))setColor(d.color);};window.addEventListener("opticaglobal:color",update);return()=>window.removeEventListener("opticaglobal:color",update);},[slug,variantIds]);
 const query=color?"?color="+encodeURIComponent(color):"";
 return <div className="product-purchase-links"><Link href={"/comprar/"+slug+query} className="btn btn-mp mt-6 w-full">Comprar como invitado</Link><Link href={"/probador?marco="+slug+(color?"&color="+encodeURIComponent(color):"")} className="btn btn-ghost mt-3 w-full">Probar este marco</Link></div>;
}
