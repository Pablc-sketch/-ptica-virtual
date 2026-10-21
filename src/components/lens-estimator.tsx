"use client";

import Link from "next/link";
import { useState } from "react";
import { estimateLentiaLensSale, LENTIA_SALE_TARIFFS, type SaleFamily } from "@/lib/lentia-sale-engine";
import type { EyePrescription, OpticalUse } from "@/lib/optical-quote-engine";
import { clp } from "@/lib/format";

const TREATMENTS = [...new Set(LENTIA_SALE_TARIFFS.filter(t => t.family === "Monofocal").map(t => t.treatment))];
type EyeFields = { sphere: string; cylinder: string; axis: string };
const EMPTY: EyeFields = { sphere: "", cylinder: "", axis: "" };
function numeric(v: string): number | null { if (!v.trim()) return null; const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : null; }
function parseEye(v: EyeFields): EyePrescription | null {
  const sphere = numeric(v.sphere), cylinder = numeric(v.cylinder), axis = numeric(v.axis);
  return sphere === null || cylinder === null ? null : { sphere, cylinder, axis };
}

export function LensEstimator() {
  const [family, setFamily] = useState<SaleFamily>("Monofocal");
  const [use, setUse] = useState<OpticalUse>("distance");
  const [treatment, setTreatment] = useState("Orgánico Antirreflejo");
  const [right, setRight] = useState<EyeFields>(EMPTY);
  const [left, setLeft] = useState<EyeFields>(EMPTY);
  const [confirmed, setConfirmed] = useState(false);
  const ready = confirmed && parseEye(right) !== null && parseEye(left) !== null;
  const request = { family, treatment, requestedUse: use, prescriptionUse: confirmed ? use : null, right: parseEye(right), left: parseEye(left) };
  const stock = estimateLentiaLensSale({ ...request, source: "stock" });
  const lab = estimateLentiaLensSale({ ...request, source: "laboratory" });
  const measurements = family !== "Monofocal";
  return <div className="lens-guide-grid">
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Tipo de lente<select value={family} onChange={e => { setFamily(e.target.value as SaleFamily); setConfirmed(false); }} className="field mt-2"><option>Monofocal</option><option>Bifocal</option><option>Multifocal</option></select></label><label className="text-sm">Receta que vas a transcribir<select value={use} disabled={measurements} onChange={e => { setUse(e.target.value as OpticalUse); setConfirmed(false); }} className="field mt-2"><option value="distance">Para lejos</option><option value="near">Para cerca</option></select></label></div>
      {measurements ? <section className="border border-line bg-sage/50 p-6" aria-labelledby="medicion-multifocal"><h2 id="medicion-multifocal" className="text-2xl">Primero, el marco y las medidas.</h2><p className="mt-4 text-sm leading-relaxed text-muted">Para bifocales y multifocales necesitamos revisar la receta y las medidas de montaje con el marco elegido y ajustado sobre tu rostro. El probador de estilo no obtiene esas medidas.</p><p className="mt-4 text-sm leading-relaxed text-muted">Puedes explorar los marcos y enviar tu receta para revisión. El precio final y la fabricación quedan pendientes de la medición y de la confirmación profesional.</p><Link href="/mi-cuenta" className="btn mt-5">Enviar receta para revisión</Link></section> : <>
        <fieldset><legend className="mb-4 text-2xl">Copia los datos de tu receta.</legend><p className="mb-5 text-sm text-muted">Conserva los signos + y −. Escribe 0 cuando tu receta indique cero; dejar un campo vacío no equivale a cero. Usa únicamente los valores del par que estás cotizando.</p><div className="grid gap-5 sm:grid-cols-2">{([{ key: "right", title: "Ojo derecho · OD", fields: right, set: setRight }, { key: "left", title: "Ojo izquierdo · OI", fields: left, set: setLeft }]).map(eye => <fieldset key={eye.key} className="border border-line bg-white/50 p-5"><legend className="px-2 text-sm font-semibold">{eye.title}</legend>{([['sphere','Esfera · ESF'],['cylinder','Cilindro · CIL'],['axis','Eje · AX']] as const).map(([key,label]) => <label key={key} htmlFor={`${eye.key}-${key}`} className="mt-3 block text-sm">{label}<input id={`${eye.key}-${key}`} type="number" step={key === "axis" ? "1" : "any"} min={key === "axis" ? "0" : undefined} max={key === "axis" ? "180" : undefined} value={eye.fields[key]} onChange={e => { eye.set(p => ({ ...p, [key]: e.target.value })); setConfirmed(false); }} className="field mt-1" inputMode={key === "axis" ? "numeric" : "decimal"} /></label>)}<p className="mt-3 text-xs text-muted">El eje se necesita cuando hay cilindro distinto de cero.</p></fieldset>)}</div></fieldset>
        <label className="block text-sm">Tratamiento o material<select value={treatment} onChange={e => setTreatment(e.target.value)} className="field mt-2">{TREATMENTS.map(t => <option key={t}>{t}</option>)}</select></label>
        <label className="flex items-start gap-3 border-t border-line pt-5 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="h-5 w-5 shrink-0 accent-olive" /><span>Copié los datos de mi receta para {use === "near" ? "cerca" : "lejos"}. Entiendo que el equipo debe revisarla y que esta estimación no es una compra.</span></label>
      </>}
    </div>
    <aside className="lens-summary" aria-labelledby="estimacion-precio"><p className="eyebrow">Precio de referencia</p><h2 id="estimacion-precio" className="mt-4 text-3xl">Tus cristales, sin adivinar.</h2><div aria-live="polite" aria-atomic="true" role="status" className="my-6 space-y-5 border-y border-line py-5">
      {measurements ? <p className="text-sm">Pendiente de medición con el marco elegido.</p> : !ready ? <p className="text-sm text-muted">Completa ambos ojos y comprueba los datos para ver las tarifas disponibles.</p> : stock.kind === "requires_review" && stock.reason === "incomplete_prescription" ? <p className="text-sm text-red-800">Revisa los datos: si hay cilindro distinto de cero, indica un eje entero entre 0 y 180 para ese ojo. No completamos valores ausentes automáticamente.</p> : <>
        {stock.kind === "lens_estimate" ? <div><p className="text-xs text-muted">Cristales de catálogo, referencia</p><p className="mt-2 text-3xl font-semibold">{clp(stock.lensSubtotalClp)}</p><p className="mt-1 text-xs text-muted">Rango {stock.range} · disponibilidad por confirmar</p></div> : <p className="text-sm text-muted">No hay tarifa automática de catálogo para esta combinación. Necesita revisión.</p>}
        {lab.kind === "lens_estimate" ? <div><p className="text-xs text-muted">Fabricación de laboratorio, referencia</p><p className="mt-2 text-3xl font-semibold">{clp(lab.lensSubtotalClp)}</p><p className="mt-1 text-xs text-muted">Rango {lab.range} · fabricación por confirmar</p></div> : <p className="text-sm text-muted">La tarifa de laboratorio también requiere revisión.</p>}
      </>}
      </div><p className="text-sm font-semibold">Estos valores son de los cristales. El marco y el despacho se confirman por separado.</p><p className="mt-3 text-xs leading-relaxed text-muted">La cotización del par completo puede usar un precio conjunto según el marco. No sumamos automáticamente estas tarifas a los precios “desde” de la portada.</p><Link href="/mi-cuenta" className="btn mt-6 w-full">Enviar receta de forma privada</Link><Link href="/marcos" className="btn btn-ghost mt-3 w-full">Elegir un marco</Link><p className="mt-4 text-xs leading-relaxed text-muted">Los valores que escribes aquí se procesan en tu navegador. No se guardan ni se envían; la receta original se comparte solo desde el envío privado de tu cuenta.</p>
    </aside>
  </div>;
}
