import {LENTIA_SALE_TARIFFS} from './lentia-sale-engine';
const TREATMENTS=new Set(['Lente básico','Cristal blanco',...LENTIA_SALE_TARIFFS.map(t=>t.treatment)]);
export type PrescriptionContext={product_id:string;requested_treatment:string;requested_use:'distance'|'near';requested_family:'Monofocal'|'Bifocal'|'Multifocal'};
export function parsePrescriptionContext(value:{product_id:unknown;requested_treatment:unknown;requested_use:unknown;requested_family:unknown}):PrescriptionContext|null {
 if(typeof value.product_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.product_id))return null;
 if(typeof value.requested_treatment!=='string'||!TREATMENTS.has(value.requested_treatment))return null;
 if(value.requested_use!=='distance'&&value.requested_use!=='near')return null;
 if(!['Monofocal','Bifocal','Multifocal'].includes(String(value.requested_family)))return null;
 return {product_id:value.product_id,requested_treatment:value.requested_treatment,requested_use:value.requested_use,requested_family:value.requested_family as PrescriptionContext['requested_family']};
}
/** Solo conserva contexto de selección en el ingreso; jamás acepta destinos externos ni graduaciones en URL. */
export function accountReturnPath(raw:string):string {
 try {const u=new URL(raw,'https://local.invalid');if(u.origin!=='https://local.invalid')return '/mi-cuenta';if(u.pathname==='/cotizar')return '/cotizar';if(u.pathname!=='/mi-cuenta')return '/mi-cuenta';const q=new URLSearchParams();for(const key of ['marco','tratamiento','uso','tipo','reemplazar']){const v=u.searchParams.get(key);if(v&&v.length<=120)q.set(key,v);}return `/mi-cuenta${q.size?'?'+q.toString():''}`;}catch{return '/mi-cuenta';}
}
