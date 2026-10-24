import {describe,it,expect} from 'vitest';
import {matchesCategory,categoryHref} from '../src/lib/catalog-categories';
import {screenPairPrice,screenInquiry} from '../src/lib/screen-lenses';
import {LENS_OPTIONS} from '../src/lib/lens-options';
import type {CatalogProduct} from '../src/lib/catalog-types';

const frame=(overrides:Partial<CatalogProduct>={}):CatalogProduct=>({id:'p',slug:'optico-oslo',name:'Oslo',sku:null,brand:null,description:null,priceClp:null,pairBasePriceClp:28000,frameShape:'Cuadrado',material:'Acetato',color:'Negro',gender:'unisex',lensWidthMm:null,bridgeMm:null,templeMm:null,images:[{url:'/products/optico-oslo-negro.webp',alt:'Oslo'}],modelUrl:null,use:'optical',...overrides});

describe('colecciones y lentes sin aumento',()=>{
 it('separa los solares aunque compartan género con los ópticos',()=>{
  const solar=frame({use:'solar'});
  expect(matchesCategory(solar,'sol')).toBe(true);
  for(const category of ['mujer','hombre','filtro-azul'] as const)expect(matchesCategory(solar,category)).toBe(false);
  expect(screenPairPrice(solar)).toBeNull();
 });
 it('incluye unisex en ambos géneros y conserva los modelos de mujer',()=>{
  expect(matchesCategory(frame(),'mujer')).toBe(true);
  expect(matchesCategory(frame(),'hombre')).toBe(true);
  const woman=frame({gender:'mujer'});
  expect(matchesCategory(woman,'mujer')).toBe(true);
  expect(matchesCategory(woman,'hombre')).toBe(false);
  expect(matchesCategory(frame({slug:'cat-eye-ambar',gender:null}),'mujer')).toBe(true);
 });
 it('muestra todos los ópticos para pantallas, también modelos fuera del mapa inicial',()=>{
  for(const slug of ['optico-oslo','optico-perla','optico-bauhaus','optico-kensington','optico-manhattan','cat-eye-ambar','cat-eye-mosaico'])expect(matchesCategory(frame({slug}),'filtro-azul')).toBe(true);
  expect(categoryHref('filtro-azul')).toBe('/sin-aumento');
 });
 it('separa $38.000 sin aumento de $48.000 con receta y respeta marcos más caros',()=>{
  expect(screenPairPrice(frame())).toBe(38000);
  expect(screenPairPrice(frame({pairBasePriceClp:38000}))).toBe(48000);
  expect(screenPairPrice(frame({pairBasePriceClp:null}))).toBeNull();
  expect(LENS_OPTIONS.find(l=>l.id==='azul')?.fromClp).toBe(48000);
 });
 it('conserva color, precio y graduación neutra en la consulta',()=>{
  const url=new URL(screenInquiry(frame(),'Lila translúcido'));
  expect(url.hostname).toBe('wa.me');
  const text=url.searchParams.get('text');
  expect(text).toContain('Lila translúcido');expect(text).toContain('SIN AUMENTO (0.00)');expect(text).toContain('$38.000');
 });
});
