import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PhotoTryOn} from '@/components/photo-try-on';
import {buildTryOnFrames} from '@/lib/tryon-catalog';
import {getPublishedProducts} from '@/lib/catalog';
export const metadata:Metadata={title:'Prueba tus marcos',description:'Ajuste facial en tu dispositivo con una foto o tu cámara. Elige entre los marcos del catálogo.'};
async function TryOn({searchParams}:{searchParams:PageProps<'/probador'>['searchParams']}){
 const q=await searchParams;let frames;
 try{frames=buildTryOnFrames(await getPublishedProducts());}
 catch{return <p role="alert">No pudimos cargar los marcos del probador. Intenta nuevamente.</p>;}
 if(!frames.length)return <p>No hay frontales disponibles para el probador.</p>;
 return <PhotoTryOn frames={frames} initialSlug={typeof q.marco==='string'?q.marco:undefined} initialColor={typeof q.color==='string'?q.color:undefined}/>;
}
export default function Probador({searchParams}:PageProps<'/probador'>){return <main className="container-page py-10 md:py-16"><div className="rx-heading"><p className="eyebrow">Óptica Global · probador</p><h1>Encuentra tu forma.</h1><p>Prueba nuestros marcos sobre tu foto. El ajuste automático alinea la imagen con tus ojos; puedes afinarlo a mano.</p></div><Suspense fallback={<p role="status">Preparando el probador…</p>}><TryOn searchParams={searchParams}/></Suspense></main>;}
