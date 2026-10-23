// Names belong to Óptica Global; supplier references stay private.
const DESIGNS:Record<string,{name:string;use:'solar'|'optical';collection:string}>={
 'ovalo-negro':{name:'Soho · Negro',use:'solar',collection:'Línea Soho'},
 'cat-eye-ambar':{name:'Riviera · Ámbar',use:'optical',collection:'Mirada felina'},
 'cat-eye-mosaico':{name:'Brera · Mosaico azul',use:'optical',collection:'Mirada felina'},
};
export function frameDesign(slug:string){return DESIGNS[slug]??null;}
