"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import type { CatalogImage } from "@/lib/catalog-types";

// El visor 3D (three/R3F) solo se descarga cuando la persona pulsa "Vista 3D".
const Viewer3D = dynamic(() => import("@/components/viewer3d"), {
  ssr: false,
  loading: () => <p className="p-6 text-muted" role="status">Cargando vista 3D…</p>,
});

export function ProductGallery({ images, modelUrl, name }: { images: CatalogImage[]; modelUrl: string | null; name: string }) {
  const [i, setI] = useState(0);
  const [show3d, setShow3d] = useState(false);
  const [failed, setFailed] = useState(false);
  const img = images[i];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden bg-sage/50">
        {show3d && !failed && modelUrl ? (
          <Viewer3D url={modelUrl} onError={() => setFailed(true)} />
        ) : (
          <Image key={img.url} src={img.url} alt={img.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain" />
        )}
      </div>
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
            onClick={() => { setI(idx); setShow3d(false); }}
            aria-label={`Ver foto ${idx + 1} de ${images.length}`}
            aria-pressed={!show3d && idx === i}
            className={`relative h-16 w-16 overflow-hidden border ${!show3d && idx === i ? "border-ink" : "border-line"}`}
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
