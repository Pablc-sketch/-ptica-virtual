"use client";
import { useState } from "react";
import { clp } from "@/lib/format";
import { checkoutTotals } from "@/lib/shipping";
const OPTIONS = [
  {id:"basico",name:"Cristal básico",extra:0},
  {id:"antirreflejo",name:"Antirreflejo",extra:10000},
  {id:"filtro-azul",name:"Filtro de luz azul",extra:20000},
];
export function CheckoutPricing({basePrice,optical}:{basePrice:number;optical:boolean}){
  const [lens,setLens]=useState(OPTIONS[0].id);
  const selected=OPTIONS.find(o=>o.id===lens)!;
  const {subtotal,shipping,total}=checkoutTotals(basePrice+(optical?selected.extra:0));
  return <>
    {optical&&<fieldset className="checkout-lenses"><legend>Cristales</legend>{OPTIONS.map(o=><label key={o.id} className={lens===o.id?"is-selected":""}><input type="radio" name="lens" value={o.id} checked={lens===o.id} onChange={()=>setLens(o.id)} required/><span>{o.name}</span><strong>{clp(basePrice+o.extra)}</strong></label>)}</fieldset>}
    <div className="checkout-summary" aria-live="polite" aria-atomic="true"><dl>
      <div><dt>Tu par de lentes</dt><dd>{clp(subtotal)}</dd></div>
      <div><dt>Envío a domicilio</dt><dd>{shipping?clp(shipping):"Gratis"}</dd></div>
      <div className="checkout-total"><dt>Total a pagar</dt><dd>{clp(total)}</dd></div>
    </dl><p>Envío gratis desde $60.000.</p></div>
  </>;
}
