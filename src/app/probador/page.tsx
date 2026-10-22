import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PhotoTryOn,type TryOnFrame} from '@/components/photo-try-on';
import {getPublishedProducts} from '@/lib/catalog';
export const metadata:Metadata={title:'Prueba tus marcos',description:'Ajuste facial en tu dispositivo con una foto o tu cámara. Elige entre los marcos del catálogo.'};
const ASSETS:Record<string,string>={'ovalo-negro':'ovalo','cat-eye-ambar':'ambar','cat-eye-mosaico':'mosaico'};
async function TryOn({searchParams}:{searchParams:PageProps<'/probador'>['searchParams']}){
 const q=await searchParams;let frames:TryOnFrame[];
 try{frames=(await getPublishedProducts()).filter(p=>ASSETS[p.slug]).map(p=>({slug:p.slug,name:p.name,color:p.color??'',url:`/products/tryon-${ASSETS[p.slug]}.webp`}));}
 catch{return <p role="alert">No pudimos cargar los marcos del probador. Intenta nuevamente.</p>;}
 if(!frames.length)return <p>No hay frontales disponibles para el probador.</p>;
 return <PhotoTryOn frames={frames} initialSlug={typeof q.marco==='string'?q.marco:undefined}/>;
}
export default function Probador({searchParams}:PageProps<'/probador'>){return <main className="container-page py-10 md:py-16"><div className="rx-heading"><p className="eyebrow">Óptica Global · probador</p><h1>Encuentra tu forma.</h1><p>Prueba nuestros marcos sobre tu foto. El ajuste automático alinea la imagen con tus ojos; puedes afinarlo a mano.</p></div><Suspense fallback={<p role="status">Preparando el probador…</p>}><TryOn searchParams={searchParams}/></Suspense></main>;}
