import {describe,it,expect} from 'vitest';
import {tryOnFrames,initialTryOnFrame} from '../src/lib/tryon-catalog';
import {cutoutWhite} from '../src/lib/tryon-cutout';
import {compareFrameIdentity,type FrameIdentity} from '../src/lib/frame-identity';
import type {CatalogProduct} from '../src/lib/catalog-types';
const p=(id:string):CatalogProduct=>({id,slug:id,name:id,sku:null,brand:null,description:null,priceClp:null,frameShape:null,material:null,color:'Negro',gender:null,lensWidthMm:null,bridgeMm:null,templeMm:null,images:[{url:`/products/${id}.webp`,alt:id}],modelUrl:null});
describe('probador sin lista cerrada',()=>{
 it('incluye modelos nuevos y conserva identidades aunque compartan color',()=>{
  const frames=tryOnFrames(Array.from({length:21},(_,i)=>p(`nuevo-${i}`)));
  expect(frames).toHaveLength(21);expect(new Set(frames.map(f=>f.id)).size).toBe(21);
 });
 it('ofrece cada color con su propio frontal y conserva selección por enlace',()=>{
  const frame=p('nuevo');frame.variants=[{id:'azul',name:'Azul',hex:'#00f',hex2:null,front:{url:'/products/azul.webp',alt:'Azul'}},{id:'sin-foto',name:'Sin foto',hex:'#fff',hex2:null,front:null}];
  frame.variants.push({id:'negro',name:'Negro',hex:'#000',hex2:null,front:{url:'/products/negro.webp',alt:'Negro'}});
  const frames=tryOnFrames([frame,p('otro')]);
  expect(frames).toHaveLength(3);expect(new Set(frames.map(f=>f.id)).size).toBe(3);
  expect(initialTryOnFrame(frames,'nuevo','negro')?.url).toBe('/products/negro.webp');
  expect(initialTryOnFrame(frames,'nuevo','azul')?.url).toBe('/products/azul.webp');
  expect(initialTryOnFrame(frames,'otro','inexistente')?.slug).toBe('otro');
  expect(initialTryOnFrame(frames,'inexistente')?.slug).toBe('nuevo');
 });
 it('conserva recortes antiguos y descarta productos sin imagen',()=>{
  const old={...p('ovalo-negro')},empty={...p('vacío'),images:[]};
  expect(tryOnFrames([old,empty])).toEqual([expect.objectContaining({url:'/products/tryon-ovalo.webp',prepared:true})]);
 });
});
describe('transparencia local del frontal',()=>{
 it('quita blanco, conserva color y recorta sin cambiar el tamaño del píxel de entrada',()=>{
  const data=new Uint8ClampedArray(10*10*4).fill(255);
  for(let y=3;y<7;y++)for(let x=2;x<8;x++){const i=(y*10+x)*4;data[i]=80;data[i+1]=30;data[i+2]=120;}
  expect(cutoutWhite(data,10,10)).toEqual({x:2,y:3,width:6,height:4});
  expect(data[3]).toBe(0);expect(data[(3*10+2)*4+3]).toBe(255);
 });
 it('rechaza imágenes vacías o sin marco visible',()=>{
  expect(()=>cutoutWhite(new Uint8ClampedArray(400).fill(255),10,10)).toThrow('no_frame');
  expect(()=>cutoutWhite(new Uint8ClampedArray(),10,10)).toThrow('invalid_image');
 });
});
const identity:FrameIdentity={manufacturer:'Fabricante de prueba',modelReference:'MODELO-A',shape:'Rectangular',material:'Metal',construction:'Semi al aire',bridgeDesign:'Simple',hingeDesign:'Estándar',lensWidthMm:52,bridgeMm:18,templeMm:140,evidenceVerified:true};
describe('criterios conservadores de identidad',()=>{
 it('solo permite agrupar con identidad, construcción y medidas verificadas',()=>expect(compareFrameIdentity(identity,{...identity})).toEqual({decision:'same-model',reasons:[]}));
 it.each(['modelReference','shape','material','construction','bridgeDesign','hingeDesign'] as const)('separa por diferencia en %s',key=>expect(compareFrameIdentity(identity,{...identity,[key]:'Distinto'}).decision).toBe('separate'));
 it.each(['lensWidthMm','bridgeMm','templeMm'] as const)('separa por diferencia en %s',key=>expect(compareFrameIdentity(identity,{...identity,[key]:99}).decision).toBe('separate'));
 it('exige revisión cuando faltan datos, aunque color y apariencia parezcan iguales',()=>{
  expect(compareFrameIdentity({},{}).decision).toBe('review');
  expect(compareFrameIdentity(identity,{...identity,evidenceVerified:false}).decision).toBe('review');
  expect(compareFrameIdentity(identity,{...identity,modelReference:undefined}).decision).toBe('review');
 });
});
