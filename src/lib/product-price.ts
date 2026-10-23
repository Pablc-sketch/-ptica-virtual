import { clp } from './format';

export type ProductPricing = {priceClp: number | null; pairBasePriceClp?: number | null; use?: 'optical' | 'solar'};
export function productPrice(p: ProductPricing): { amount: number | null; label: string; text: string } {
  if (p.pairBasePriceClp != null && Number.isSafeInteger(p.pairBasePriceClp) && p.pairBasePriceClp > 0)
    return {amount:p.pairBasePriceClp,label:p.use==='solar'?'el par, con sus cristales de sol':'marco + lentes básicos',text:`Desde ${clp(p.pairBasePriceClp)}`};
  if (p.priceClp != null && Number.isSafeInteger(p.priceClp) && p.priceClp > 0)
    return {amount:p.priceClp,label:'solo marco',text:clp(p.priceClp)};
  return {amount:null,label:'',text:'Precio por confirmar'};
}
