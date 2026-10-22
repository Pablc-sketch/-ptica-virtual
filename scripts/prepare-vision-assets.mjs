import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../public/vision/',import.meta.url);
await mkdir(root,{recursive:true});
for(const name of ['vision_wasm_internal','vision_wasm_nosimd_internal','vision_wasm_module_internal'])for(const ext of ['js','wasm'])await copyFile(new URL(`../node_modules/@mediapipe/tasks-vision/wasm/${name}.${ext}`,import.meta.url),new URL(`${name}.${ext}`,root));
const model=new URL('face_landmarker.task',root);
let bytes;try{bytes=await readFile(model);}catch{const r=await fetch('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('No se pudo obtener el modelo facial oficial.');bytes=Buffer.from(await r.arrayBuffer());await writeFile(model,bytes);}
if(createHash('sha256').update(bytes).digest('hex')!=='64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff')throw Error('El modelo facial no coincide con la versión revisada.');
console.log('Modelo facial local preparado',bytes.length,createHash('sha256').update(bytes).digest('hex'));
