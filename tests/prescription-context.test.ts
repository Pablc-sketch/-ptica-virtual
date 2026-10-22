import {describe,it,expect} from 'vitest';
import {parsePrescriptionContext,accountReturnPath} from '../src/lib/prescription-context';
const base={product_id:'70e13021-72b1-43d8-9030-000000000002',requested_treatment:'Orgánico Antirreflejo',requested_use:'near',requested_family:'Monofocal'};
describe('contexto privado de la selección',()=>{
 it('acepta opciones documentadas sin importes ni valores de receta',()=>{
  expect(parsePrescriptionContext(base)).toEqual(base);
  expect(parsePrescriptionContext({...base,requested_family:'Multifocal'})).toMatchObject({requested_family:'Multifocal'});
  const oldRow={...base,id:'old-row-id',status:'needs_new_file',quote_id:'private-old-quote',price_clp:1};
  expect(parsePrescriptionContext(oldRow)).toEqual(base);
 });
 it('rechaza contexto parcial y tratamiento o destino no permitidos',()=>{
  for(const bad of [{product_id:'no-uuid'},{requested_treatment:'Inventado'},{requested_use:'automatico'},{requested_family:'Diagnóstico'},{requested_treatment:null}])expect(parsePrescriptionContext({...base,...bad})).toBeNull();
 });
 it('el acceso conserva solo selección y nunca redirige fuera ni pone graduaciones en URL',()=>{
  expect(accountReturnPath('/mi-cuenta?marco=ambar&tratamiento=Cristal+blanco&uso=near&tipo=Monofocal&esfera=-3&redirect=https://evil.invalid')).toBe('/mi-cuenta?marco=ambar&tratamiento=Cristal+blanco&uso=near&tipo=Monofocal');
  for(const path of ['https://evil.invalid','//evil.invalid/mi-cuenta','/admin','/mi-cuenta/otro'])expect(accountReturnPath(path)).toBe('/mi-cuenta');
 });
});
