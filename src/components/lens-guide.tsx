"use client";

import Link from "next/link";
import { useState } from "react";
import { LENS_OPTIONS, type LensOptionId } from "@/lib/lens-options";
import { clp } from "@/lib/format";

const USES = [
  { id: "lejos", title: "Para lejos", detail: "Quiero cotizar el par de lejos indicado en mi receta." },
  { id: "cerca", title: "Para cerca", detail: "Quiero cotizar mi par para lectura o trabajo de cerca." },
  { id: "orientacion", title: "Necesito orientación", detail: "Prefiero que revisen mi receta antes de decidir." },
] as const;

export function LensGuide() {
  const [use, setUse] = useState<string>("");
  const [lens, setLens] = useState<LensOptionId>("blanco");
  const option = LENS_OPTIONS.find(o => o.id === lens)!;
  const useLabel = USES.find(o => o.id === use)?.title;
  return <div className="lens-guide-grid">
    <div className="min-w-0">
      <fieldset className="mb-10"><legend className="mb-5 text-2xl"><span className="lens-step">01</span> ¿Para qué par estás buscando?</legend>
        <div className="grid gap-3">{USES.map(o => <label key={o.id} className={`lens-choice ${use === o.id ? "is-selected" : ""}`}>
          <input type="radio" name="uso" value={o.id} checked={use === o.id} onChange={() => setUse(o.id)} />
          <span><strong>{o.title}</strong><small>{o.detail}</small></span>
        </label>)}</div>
        <p className="mt-4 text-sm text-muted">Esto indica qué deseas cotizar. No transforma una receta de lejos en una de cerca: el equipo revisará la indicación original.</p>
      </fieldset>
      <fieldset><legend className="mb-5 text-2xl"><span className="lens-step">02</span> Elige una opción de cristal</legend>
        <div className="grid gap-3">{LENS_OPTIONS.map(o => <label key={o.id} className={`lens-choice ${lens === o.id ? "is-selected" : ""}`}>
          <input type="radio" name="cristal" value={o.id} checked={lens === o.id} onChange={() => setLens(o.id)} />
          <span><strong>{o.name}</strong><small>{o.note}</small><small>{o.extraClp === 0 ? "Opción base" : `+ ${clp(o.extraClp)} respecto del blanco`}</small></span>
          <span className="lens-choice-price"><small>Par desde</small>{clp(o.fromClp)}</span>
        </label>)}</div>
        <p className="mt-4 text-sm text-muted">Los valores iniciales corresponden a marco y cristales. El total depende del marco, la receta y las características que confirme el equipo. Otras opciones se cotizan por separado.</p>
      </fieldset>
    </div>
    <aside className="lens-summary" aria-labelledby="resumen-cristales">
      <p className="eyebrow">Tu punto de partida</p><h2 id="resumen-cristales" className="mt-4 text-3xl">Un par pensado para ti.</h2>
      <dl className="my-6 space-y-4 border-y border-line py-5 text-sm">
        <div><dt className="text-muted">Uso que quieres cotizar</dt><dd className="mt-1 font-semibold">{useLabel ?? "Elige una opción"}</dd></div>
        <div><dt className="text-muted">Cristal elegido</dt><dd className="mt-1 font-semibold">{option.name}</dd></div>
        <div><dt className="text-muted">Marco</dt><dd className="mt-1">Se elige en el catálogo</dd></div>
      </dl>
      <div role="status" aria-live="polite" aria-atomic="true"><p className="text-xs text-muted">Precio inicial del par, desde</p><p className="my-2 text-4xl font-semibold">{clp(option.fromClp)}</p><p className="text-xs text-muted">Referencia de partida. Aún no es una cotización final ni un carrito.</p></div>
      <Link href="/marcos" className="btn mt-6 w-full">Elegir mi marco <span aria-hidden="true">↗</span></Link>
      <Link href="/cotizar-receta" className="btn btn-ghost mt-3 w-full">Cotizar según mi graduación</Link>
      <Link href="/mi-cuenta" className="btn btn-ghost mt-3 w-full">Ya elegí: enviar mi receta</Link>
      <p className="mt-4 text-xs leading-relaxed text-muted">La receta se envía con tu cuenta de forma privada. El equipo confirma la combinación y el total antes del pago. Esta guía no guarda ni envía tus elecciones.</p>
      <Link href="/probador" className="mt-5 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Probar una forma en mi foto →</Link>
    </aside>
  </div>;
}
