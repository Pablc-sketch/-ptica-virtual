import {estimateLentiaLensSale, type LensSaleRequest} from './lentia-sale-engine';

/** Paquete inicial aprobado + diferencia de la tarifa real respecto al stock básico del mismo tratamiento.
 * No suma el precio íntegro de los cristales al precio del par. Siempre sujeto a revisión y existencia.
 */
export function estimateFramePair(basePairClp:number,request:LensSaleRequest) {
  if(!Number.isSafeInteger(basePairClp)||basePairClp<=0) return {kind:'requires_review' as const,reason:'frame_price_missing'};
  const extra=request.treatment==='Orgánico Antirreflejo'?10000:request.treatment==='Orgánico Filtro Azul'?20000:null;
  if(extra===null)return {kind:'requires_review' as const,reason:'package_treatment_unconfigured'};
  const chosen=estimateLentiaLensSale(request);
  if(chosen.kind!=='lens_estimate')return chosen;
  const reference=estimateLentiaLensSale({...request,source:'stock',right:{sphere:0,cylinder:0},left:{sphere:0,cylinder:0}});
  if(reference.kind!=='lens_estimate')return {kind:'requires_review' as const,reason:'baseline_missing'};
  const difference=chosen.lensSubtotalClp-reference.lensSubtotalClp;
  const total=basePairClp+extra+difference;
  if(difference<0||!Number.isSafeInteger(total)||total<=0)return {kind:'requires_review' as const,reason:'inconsistent_tariff'};
  return {kind:'pair_estimate' as const,totalClp:total,basePairClp,treatmentExtraClp:extra,tariffDifferenceClp:difference,range:chosen.range,requiresProfessionalReview:true as const,includesShipping:false as const};
}
