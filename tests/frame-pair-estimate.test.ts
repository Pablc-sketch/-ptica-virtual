import {describe,it,expect} from 'vitest';
import {estimateFramePair} from '../src/lib/frame-pair-estimate';
import {estimateLentiaLensSale,LENTIA_SALE_TARIFFS,type LensSaleRequest} from '../src/lib/lentia-sale-engine';
import {productPrice} from '../src/lib/product-price';
const r:LensSaleRequest={family:'Monofocal',treatment:'Orgánico Antirreflejo',source:'stock',requestedUse:'distance',prescriptionUse:'distance',right:{sphere:-2,cylinder:-2,axis:90},left:{sphere:0,cylinder:0}};
describe('paquete con marco sin duplicar cristales',()=>{
 it('AR básico38mil y azul48mil, no28+38 ni28+10+20',()=>{
  expect(estimateFramePair(28000,r)).toMatchObject({kind:'pair_estimate',totalClp:38000,tariffDifferenceClp:0});
  expect(estimateFramePair(28000,{...r,treatment:'Orgánico Filtro Azul'})).toMatchObject({totalClp:48000});
 });
 it('aplica diferencias reales de graduación y laboratorio, conserva el precio del marco elegido',()=>{
  const high={...r,left:{sphere:-3,cylinder:-3,axis:40}};
  expect(estimateFramePair(28000,high)).toMatchObject({totalClp:42000,tariffDifferenceClp:4000});
  expect(estimateFramePair(28000,{...high,treatment:'Orgánico Filtro Azul'})).toMatchObject({totalClp:55000});
  expect(estimateFramePair(28000,{...r,source:'laboratory'})).toMatchObject({totalClp:55000});
  expect(estimateFramePair(38000,r)).toMatchObject({totalClp:48000});
 });
 it('no fabrica precios para materiales sin política, precio ausente o multifocal',()=>{
  expect(estimateFramePair(28000,{...r,treatment:'Blanco'}).kind).toBe('requires_review');
  expect(estimateFramePair(0,r).kind).toBe('requires_review');
  expect(estimateFramePair(28000,{...r,family:'Multifocal'}).kind).toBe('requires_review');
 });
 it('rechaza valores no finitos y pasos no válidos antes de buscar precio',()=>{
  for(const sphere of [NaN,Infinity,1.11])expect(estimateLentiaLensSale({...r,right:{sphere,cylinder:0}}).kind).toBe('requires_review');
 });
 it('audita todas las tarifas monofocales: extremos y orden de los ojos conservan el mismo importe',()=>{
  for(const t of LENTIA_SALE_TARIFFS.filter(t=>t.family==='Monofocal')){
   const m=/±([\d.]+)\s*\/\s*±([\d.]+)/.exec(t.range)!;
   for(const source of ['stock','laboratory'] as const){
    const req={...r,treatment:t.treatment,source,right:{sphere:-Number(m[1]),cylinder:-Number(m[2]),axis:90},left:{sphere:0,cylinder:0}};
    const expected=source==='stock'?t.stockSaleClp:t.laboratorySaleClp;
    const actual=estimateLentiaLensSale(req);
    if(expected==null)expect(actual.kind).toBe('requires_review');else expect(actual).toMatchObject({kind:'lens_estimate',lensSubtotalClp:expected});
    expect(estimateLentiaLensSale({...req,right:req.left,left:req.right})).toEqual(actual);
   }
  }
 });
 it('distingue precios desconocidos del cero y paquetes de solo marco',()=>{
  expect(productPrice({priceClp:null}).amount).toBeNull();
  expect(productPrice({priceClp:0}).text).toBe('Precio por confirmar');
  expect(productPrice({priceClp:null,pairBasePriceClp:28000})).toMatchObject({amount:28000,label:'marco + lentes básicos'});
 });
});
