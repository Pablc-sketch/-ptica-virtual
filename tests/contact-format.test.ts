import {describe,it,expect} from 'vitest';
import {normalizeMobile,mobileDraft,formatName} from '../src/lib/contact-format';
import {parseAddress} from '../src/lib/addresses';

describe('formatos chilenos',()=>{
 it('normaliza celulares locales e internacionales al mismo +569',()=>{
  for(const input of ['912345678','12345678','+56 9 1234 5678','56912345678','0056912345678'])expect(normalizeMobile(input)).toBe('+56912345678');
  for(const input of ['123','+541112345678','abc123','+569123456789'])expect(normalizeMobile(input)).toBeNull();
 });
 it('mantiene prefijo y separa visualmente los 8 dígitos',()=>{
  expect(mobileDraft('+569')).toBe('+569');
  expect(mobileDraft('912345678')).toBe('+569 1234 5678');
  expect(mobileDraft('+569 12345')).toBe('+569 1234 5');
 });
 it('conserva tildes, apellidos y números con cero inicial',()=>{
  expect(formatName('  PABLO   DE LA FUENTE  ')).toBe('Pablo de la Fuente');
  const data={recipient:'  ANA   PÉREZ ',phone:'912345678',region:'Metropolitana',comuna:'  ÑUÑOA ',street:' Av.   Irarrázaval ',street_number:'0076',unit:' 12 B ',notes:''};
  expect(parseAddress(k=>data[k as keyof typeof data])).toMatchObject({ok:true,value:{recipient:'Ana Pérez',phone:'+56912345678',comuna:'Ñuñoa',street:'Av. Irarrázaval',street_number:'0076',unit:'12 B'}});
  expect(parseAddress(k=>k==='street_number'?'s/n':data[k as keyof typeof data])).toMatchObject({ok:true,value:{street_number:'S/N'}});
 });
});
