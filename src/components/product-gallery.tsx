"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import {useRouter} from 'next/navigation';
import type { CatalogImage, CatalogVariant } from "@/lib/catalog-types";

// El visor 3D (three/R3F) solo se descarga cuando la persona pulsa "Vista 3D".
const Viewer3D = dynamic(() => import("@/components/viewer3d"), {
  ssr: false,
  loading: () => <p className="p-6 text-muted" role="status">Cargando vista 3D…</p>,
});

export function ProductGallery({ images: baseImages, modelUrl, name, variants = [], initialColor }: {
  images: CatalogImage[]; modelUrl: string | null; name: string; variants?: CatalogVariant[]; initialColor?: string;
}) {
  // Con colores, las fotos en fondo blanco (frente y posterior) son las del color elegido; el resto son de contexto del modelo.
  const [colorIdx, setColorIdx] = useState(() => Math.max(0, variants.findIndex((v) => v.id === initialColor)));
  const variant = variants[colorIdx];
  const colorUrls = new Set(variants.flatMap((v) => [v.front?.url, v.back?.url]));
  const images = variant?.front
    ? [variant.front, ...(variant.back ? [variant.back] : []), ...baseImages.filter((m) => !colorUrls.has(m.url))]
    : baseImages;
  const [i, setI] = useState(0);
  const [show3d, setShow3d] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoomed,setZoomed]=useState(false);
  const [tone,setTone]=useState('linen');
  const router=useRouter();
  const img = images[i];
  const studio=i===0||colorUrls.has(img.url);
  const chooseImage=(idx:number)=>{setI(idx);setShow3d(false);setZoomed(false);};
  return (
    <div className="gallery-shell">
      <div className="gallery-heading"><span className="eyebrow">El detalle hace la diferencia</span><span>{name}</span></div>
      <div className={`product-gallery gallery-stage stage-${tone} relative aspect-[4/3] overflow-hidden ${studio?'is-studio':'is-lifestyle'} ${zoomed?'is-zoomed':''}`}>
        {show3d && !failed && modelUrl ? (
          <Viewer3D url={modelUrl} onError={() => setFailed(true)} />
        ) : (
          <button type="button" className="gallery-zoom-hit" aria-label={zoomed?'Reducir fotografía':'Ampliar fotografía'} aria-pressed={zoomed} onClick={()=>setZoomed(v=>!v)} onPointerMove={e=>{if(zoomed){const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--zoom-x',`${(e.clientX-r.left)/r.width*100}%`);e.currentTarget.style.setProperty('--zoom-y',`${(e.clientY-r.top)/r.height*100}%`);}}}>
            <Image key={img.url} src={img.url} alt={img.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className={studio ? "object-contain" : "object-cover"} />
          </button>
        )}
        {!show3d&&<div className="gallery-caption"><span>{variant?.name??'Una mirada personal'}</span><span>{zoomed?'Toca para volver −':'Explora los detalles +'}</span></div>}
      </div>
      {!show3d&&studio&&<div className="gallery-tools"><span>Tu marco, en otro ambiente</span><div role="group" aria-label="Fondo de la fotografía">{[['linen','Lino'],['stone','Piedra'],['rose','Arcilla']].map(([value,label])=><button key={value} type="button" className={`gallery-tone tone-${value}`} aria-label={`Fondo ${label}`} aria-pressed={tone===value} onClick={()=>setTone(value)}><span/>{label}</button>)}</div></div>}
      {variants.length > 1 && (
        <fieldset className="color-picker mt-4">
          <legend className="text-sm">Color: <strong>{variant?.name}</strong></legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((v, idx) => (
              <label key={v.id} className="color-swatch" title={v.name}>
                <input type="radio" name="color" value={v.id} checked={idx === colorIdx} className="sr-only"
                  onChange={() => { setColorIdx(idx); chooseImage(0); const u = new URL(window.location.href); u.searchParams.set("color", v.id); router.replace(u.pathname+u.search,{scroll:false}); }} />
                <span aria-hidden="true" style={{ background: v.hex2 ? `linear-gradient(135deg, ${v.hex} 50%, ${v.hex2} 50%)` : v.hex }} />
                <span className="sr-only">{v.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!show3d&&img.alt.startsWith('Imagen ambientada')&&<p className="mt-2 text-xs text-muted">Imagen ambientada digitalmente.</p>}
      {failed && (
        <p role="alert" className="mt-2 text-sm text-muted">
          No pudimos cargar el modelo 3D en este dispositivo. Puedes seguir viendo las fotografías.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {images.map((m, idx) => (
          <button
            key={m.url}
            type="button"
            onClick={() => chooseImage(idx)}
            aria-label={`Ver foto ${idx + 1} de ${images.length}`}
            aria-pressed={!show3d && idx === i}
            className={`gallery-thumbnail relative h-16 w-16 overflow-hidden border ${!show3d && idx === i ? "border-ink" : "border-line"}`}
          >
            <Image src={m.url} alt="" fill sizes="64px" className="object-cover" />
          </button>
        ))}
        {modelUrl && !failed && (
          <button type="button" onClick={() => setShow3d((v) => !v)} aria-pressed={show3d} className="btn btn-ghost !min-h-16">
            {show3d ? "Volver a las fotos" : "Vista 3D"}
          </button>
        )}
      </div>
      {show3d && !failed && (
        <p className="mt-2 text-xs text-muted">
          Modelo 3D de referencia de {name}. No es un probador facial ni garantiza el ajuste.
        </p>
      )}
    </div>
  );
}
