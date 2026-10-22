import {describe,it,expect} from 'vitest';
import {emptyPower,editPower,readPower,formatPower,readAxis,readMillimetres} from '../src/lib/prescription-input';
import {tariffTreatment} from '../src/lib/lens-treatments';
import {estimateLentiaLensSale} from '../src/lib/lentia-sale-engine';
describe('transcripción explícita de receta',()=>{
 it('nunca inventa signos ni convierte un campo vacío a cero',()=>{expect(readPower(emptyPower())).toBeNull();expect(readPower({sign:'',magnitude:'1.25'})).toBeNull();expect(readPower({sign:'+',magnitude:'0'})).toBe(0);});
 it('acepta signo pegado, coma y menos Unicode, y formatea con punto',()=>{const p=editPower(emptyPower(),'−1,25');expect(readPower(p)).toBe(-1.25);expect(formatPower(editPower(emptyPower(),'+2'))).toEqual({sign:'+',magnitude:'2.00'});});
 it('rechaza notación exponencial, signos duplicados y pasos incorrectos',()=>{for(const magnitude of ['1e2','-1.00','1.11','Infinity','1.2.3'])expect(readPower({sign:'-',magnitude})).toBeNull();});
 it('eje entero sin signo entre 0 y 180, nunca números decimales o mayores',()=>{expect(readAxis('180')).toBe(180);expect(readAxis('0')).toBe(0);for(const v of ['181','90.5','-1','','1e2'])expect(readAxis(v)).toBeNull();});
 it('DP es opcional y no se convierte en graduación ni altura',()=>{expect(readMillimetres('31,5')).toBe(31.5);expect(readMillimetres('')).toBeNull();expect(readMillimetres('0')).toBeNull();});
 it('conserva tratamientos reales por familia y color, sin tarifa inventada',()=>{expect(tariffTreatment('ar','gris','Bifocal')).toBe('Bifocal Antirreflejo');expect(tariffTreatment('photo','cafe','Monofocal')).toBe('Fotocromático Café Antirreflejo');expect(tariffTreatment('polar','verde','Monofocal')).toBe('Polarizado Verde Oscuro');});
 it('rechaza eje incorrecto incluso con cilindro cero',()=>{expect(estimateLentiaLensSale({family:'Monofocal',treatment:'Orgánico Antirreflejo',source:'stock',requestedUse:'distance',prescriptionUse:'distance',right:{sphere:0,cylinder:0,axis:181},left:{sphere:0,cylinder:0}}).kind).toBe('requires_review');});
});
