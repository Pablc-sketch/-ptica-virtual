// Offline only: JSON {pairs:[{a:{...},b:{...}}]} on stdin; no database or network.
// Run with Node's TypeScript support: node --experimental-strip-types scripts/review-frame-identity.mjs
import {compareFrameIdentity} from '../src/lib/frame-identity.ts';
let text='';for await(const chunk of process.stdin)text+=chunk;
try{
 const input=JSON.parse(text);
 if(!Array.isArray(input.pairs)||input.pairs.length>1000)throw Error('invalid_input');
 const results=input.pairs.map((p,index)=>{
  if(!p?.a||!p?.b||typeof p.a!=='object'||typeof p.b!=='object')throw Error('invalid_pair');
  return {pair:index,...compareFrameIdentity(p.a,p.b)};
 });
 console.log(JSON.stringify({results,applied:false}));
}catch{console.error('Entrada inválida: se espera JSON con un máximo de 1000 pares de identidad.');process.exitCode=1;}
