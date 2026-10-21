"use client";

import { useEffect, useRef, useState } from "react";
import { FrameOutline } from "@/components/frame-outline";

type Shape = "rectangular" | "round" | "cat-eye";
const START = { x: 50, y: 40, width: 64, rotation: 0 };
const SHAPES: { id: Shape; label: string }[] = [{ id: "rectangular", label: "Rectangular" }, { id: "round", label: "Redondo" }, { id: "cat-eye", label: "Cat eye" }];

export function PhotoTryOn() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [shape, setShape] = useState<Shape>("rectangular");
  const [position, setPosition] = useState(START);
  const [showFrame, setShowFrame] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const faceInput = useRef<HTMLInputElement>(null);
  const frameInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const alive = useRef(true);
  const opening = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  useEffect(() => () => { if (frame) URL.revokeObjectURL(frame); }, [frame]);

  async function choose(file: File | undefined, kind: "face" | "frame") {
    if (!file || opening.current) return;
    setError(null);
    const types = kind === "frame" ? ["image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp"];
    if (!types.includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
      setError(kind === "frame" ? "Elige un PNG o WebP transparente de hasta 8 MB." : "Elige una foto JPG, PNG o WebP de hasta 8 MB. Convierte las fotos HEIC antes de usarlas.");
      if (kind === "frame" && frameInput.current) frameInput.current.value = "";
      if (kind === "face" && faceInput.current) faceInput.current.value = "";
      return;
    }
    opening.current = true;
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const tooLarge = bitmap.width * bitmap.height > 25000000;
      bitmap.close();
      if (!alive.current) return;
      if (tooLarge) { setError("La imagen es demasiado grande para esta vista. Usa una copia de hasta 25 megapíxeles."); return; }
      const url = URL.createObjectURL(file);
      if (kind === "face") { setPhoto(url); setPosition(START); }
      else setFrame(url);
    } catch { if (alive.current) setError("No pudimos abrir esta imagen. Exporta una copia en un formato compatible e inténtalo otra vez."); }
    finally { opening.current = false; if (alive.current) setBusy(false); }
  }

  function clear() {
    setPhoto(null); setFrame(null); setPosition(START); setShowFrame(true); setError(null);
    if (faceInput.current) faceInput.current.value = "";
    if (frameInput.current) frameInput.current.value = "";
  }

  return <div className="tryon-grid">
    <div className="min-w-0">
      <div ref={stage} className="tryon-stage" aria-label="Vista de estilo sobre tu foto">
        {photo ? <>
          {/* Fotos locales: no pasan por el optimizador ni por ningún servidor. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Tu foto seleccionada, visible solo en este navegador" className="tryon-face" />
          {showFrame && <div className="tryon-frame" aria-hidden="true" style={{ left: `${position.x}%`, top: `${position.y}%`, width: `${position.width}%`, transform: `translate(-50%,-50%) rotate(${position.rotation}deg)` }}
            onPointerDown={e => { if (busy) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { startX: e.clientX, startY: e.clientY, x: position.x, y: position.y }; }}
            onPointerMove={e => { if (!drag.current || !stage.current) return; const rect = stage.current.getBoundingClientRect(); const d = drag.current; setPosition(p => ({ ...p, x: Math.max(0, Math.min(100, d.x + (e.clientX - d.startX) / rect.width * 100)), y: Math.max(0, Math.min(100, d.y + (e.clientY - d.startY) / rect.height * 100)) })); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            {frame ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frame} alt="" draggable={false} className="w-full" />
            </> : <FrameOutline shape={shape} />}
          </div>}
        </> : <div className="tryon-empty"><span className="eyebrow">Tu foto va aquí</span><svg width="112" height="128" viewBox="0 0 112 128" fill="none" aria-hidden="true"><circle cx="56" cy="40" r="25" stroke="currentColor" strokeWidth="1.4"/><path d="M13 119c0-56 86-56 86 0M31 37h20v13H31zM61 37h20v13H61zM51 41h10" stroke="currentColor" strokeWidth="1.4"/></svg><p>Una foto de frente.<br />Una forma de empezar a elegir.</p></div>}
        <p className="tryon-stage-note">{frame ? "Imagen de marco añadida en este dispositivo" : "Guía con siluetas · no representa un producto del catálogo"}</p>
      </div>
      <p className="mt-3 text-xs text-muted">Puedes arrastrar el marco o usar los controles. La escala es visual: no mide el rostro ni la distancia pupilar y no confirma el ajuste.</p>
    </div>
    <div className="tryon-controls">
      <p className="eyebrow">01 / Tu foto, en privado</p><h2 className="mb-3 mt-3 text-2xl">Mírate con otra forma.</h2><p className="mb-5 text-sm text-muted">Elige una foto de frente, con buena luz y sin anteojos. La foto se abre en este navegador y no se envía a la tienda.</p>
      <label htmlFor="tryon-face" className="text-sm font-semibold">{photo ? "Cambiar mi foto" : "Elegir mi foto"}</label><input ref={faceInput} id="tryon-face" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { void choose(e.target.files?.[0], "face"); }} className="field mt-2 !px-2 !py-3 text-xs" aria-describedby="tryon-file-help" /><p id="tryon-file-help" className="mt-2 text-xs text-muted">JPG, PNG o WebP · hasta 8 MB</p>
      <fieldset className="mt-7"><legend className="eyebrow">02 / Explora una silueta</legend><div className="mt-3 grid grid-cols-3 gap-2">{SHAPES.map(s => <button key={s.id} type="button" aria-pressed={shape === s.id && !frame} className={`tryon-shape ${shape === s.id && !frame ? "is-selected" : ""}`} onClick={() => { setShape(s.id); setFrame(null); }}><FrameOutline shape={s.id} /><span>{s.label}</span></button>)}</div></fieldset>
      <details className="mt-4 text-sm"><summary className="min-h-11 cursor-pointer py-3 underline underline-offset-4">Usar una imagen frontal de un marco</summary><p className="my-3 text-xs text-muted">Si tienes la imagen del modelo, elige un PNG o WebP con fondo transparente. Se superpone tal como está; no generamos ni recortamos el producto.</p><input ref={frameInput} aria-label="Imagen frontal del marco con fondo transparente" type="file" accept="image/png,image/webp" disabled={busy} onChange={e => { void choose(e.target.files?.[0], "frame"); }} className="field !px-2 !py-3 text-xs" /></details>
      <fieldset disabled={!photo || busy} className="mt-7 space-y-4"><legend className="eyebrow mb-4">03 / Acomoda a tu gusto</legend>{([['x','Horizontal',0,100,'%'],['y','Altura',0,100,'%'],['width','Tamaño',20,100,'%'],['rotation','Giro',-30,30,'°']] as const).map(([key,label,min,max,unit]) => <label key={key} className="block text-sm"><span className="flex justify-between gap-3"><span>{label}</span><output>{Math.round(position[key])}{unit}</output></span><input type="range" min={min} max={max} value={position[key]} onChange={e => setPosition(p => ({ ...p, [key]: Number(e.target.value) }))} className="mt-2 min-h-8 w-full accent-olive" /></label>)}<label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={showFrame} onChange={e => setShowFrame(e.target.checked)} className="h-5 w-5 accent-olive" />Mostrar marco sobre mi foto</label></fieldset>
      {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}{busy && <p role="status" className="mt-4 text-sm">Abriendo imagen en tu dispositivo…</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="btn btn-ghost" disabled={!photo || busy} onClick={() => setPosition(START)}>Centrar de nuevo</button><button type="button" className="btn btn-ghost" disabled={busy || (!photo && !frame)} onClick={clear}>Quitar mis imágenes</button></div>
      <p className="mt-5 text-xs text-muted">No se guarda una copia al cerrar la página. Esta vista ayuda a comparar el estilo; las medidas y el ajuste se revisan por separado.</p>
    </div>
  </div>;
}
