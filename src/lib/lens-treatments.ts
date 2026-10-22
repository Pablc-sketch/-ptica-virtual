import type {SaleFamily} from './lentia-sale-engine';
export const TREATMENT_CHOICES=[
 {id:'basic',name:'Lente básico',detail:'Transparente, para el día a día con tu receta.',swatch:'clear',extra:0},
 {id:'ar',name:'Antirreflejo',detail:'Tratamiento para reducir reflejos en el cristal.',swatch:'ar',extra:10000},
 {id:'blue',name:'Filtro azul',detail:'Una alternativa con filtro de luz azul.',swatch:'blue',extra:20000},
 {id:'photo',name:'Fotocromático',detail:'Gris o café. Se confirma la combinación con tu receta.',swatch:'photo',extra:null},
 {id:'polar',name:'Polarizado',detail:'Cristales de sol en gris, café o verde.',swatch:'polar',extra:null},
] as const;
export type TreatmentChoice=typeof TREATMENT_CHOICES[number]['id'];
export type LensTint='gris'|'cafe'|'verde';
export function tariffTreatment(choice:TreatmentChoice,tint:LensTint,family:SaleFamily):string {
 if(choice==='basic')return 'Lente básico';
 if(choice==='photo')return tint==='cafe'?'Fotocromático Café Antirreflejo':'Fotocromático Gris Filtro Azul';
 if(choice==='polar')return tint==='cafe'?'Polarizado Café':tint==='verde'?'Polarizado Verde Oscuro':'Polarizado Gris Oscuro';
 return `${family==='Monofocal'?'Orgánico':family} ${choice==='ar'?'Antirreflejo':'Filtro Azul'}`;
}
export function treatmentLabel(value:string):string {return value==='Cristal blanco'?'Lente básico':value;}
