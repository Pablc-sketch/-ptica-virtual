"use client";
/* Local images and camera frames stay in memory. The worker emits coordinates, never medical measurements. */
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {facePlacement,type FacePoint} from '@/lib/face-placement';
export type TryOnFrame={slug:string;name:string;url:string;color:string};
const START={x:50,y:40,width:64,rotation:0};
export function PhotoTryOn({frames,initialSlug}:{frames:TryOnFrame[];initialSlug?:string}) {
 const [photo,setPhoto]=useState<string|null>(null),[selected,setSelected]=useState(initialSlug??frames[0]?.slug??'');
 const [position,setPosition]=useState(START),[showFrame,setShowFrame]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[camera,setCamera]=useState(false);
 const frame=frames.find(f=>f.slug===selected)??frames[0];
 const stage=useRef<HTMLDivElement>(null),image=useRef<HTMLImageElement>(null),video=useRef<HTMLVideoElement>(null),input=useRef<HTMLInputElement>(null);
 const worker=useRef<Worker|null>(null),stream=useRef<MediaStream|null>(null),alive=useRef(true),opening=useRef(false),adjusting=useRef(false),job=useRef(0);
 const drag=useRef<{startX:number;startY:number;x:number;y:number}|null>(null),cancel=useRef<(()=>void)|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cancel.current?.();worker.current?.terminate();stream.current?.getTracks().forEach(t=>t.stop());};},[]);
 useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo);},[photo]);
 useEffect(()=>{if(camera&&video.current){video.current.srcObject=stream.current;void video.current.play().catch(()=>setError('No se pudo mostrar la cámara. Puedes subir una foto.'));}},[camera]);
 function stopCamera(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false);}
 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){setError('La cámara no está disponible en este navegador. Puedes subir una foto.');return;}
  setError('');
  try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:1280}},audio:false});if(!alive.current){s.getTracks().forEach(t=>t.stop());return;}stream.current?.getTracks().forEach(t=>t.stop());stream.current=s;setCamera(true);}
  catch{if(alive.current)setError('No se pudo abrir la cámara. Revisa su permiso o elige una foto.');}
 }
 function capture(){const v=video.current;if(!v?.videoWidth)return;const canvas=document.createElement('canvas');const scale=Math.min(1,1600/v.videoWidth);canvas.width=Math.round(v.videoWidth*scale);canvas.height=Math.round(v.videoHeight*scale);canvas.getContext('2d')?.drawImage(v,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(blob&&alive.current){setPhoto(URL.createObjectURL(blob));setPosition(START);setMessage('');}},'image/jpeg',.92);stopCamera();}
 async function choose(file:File|undefined){
  if(!file||opening.current)return;setError('');setMessage('');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>8*1024*1024){setError('Elige un JPG, PNG o WebP de hasta 8 MB. Convierte las fotos HEIC antes de usarlas.');if(input.current)input.current.value='';return;}
  opening.current=true;setBusy(true);
  try{const bitmap=await createImageBitmap(file),tooLarge=bitmap.width*bitmap.height>25000000;bitmap.close();if(!alive.current)return;if(tooLarge){setError('Usa una imagen de hasta 25 megapíxeles.');return;}stopCamera();setPhoto(URL.createObjectURL(file));setPosition(START);}
  catch{if(alive.current)setError('No pudimos abrir esa imagen. Prueba con otra foto.');}
  finally{opening.current=false;if(alive.current)setBusy(false);}
 }
 async function alignFace(){
  if(!image.current?.naturalWidth||!stage.current||adjusting.current)return;
  adjusting.current=true;setBusy(true);setError('');setMessage('Ajustando el marco en tu dispositivo…');
  const id=++job.current,source=image.current,dimensions={width:source.naturalWidth,height:source.naturalHeight};
  try{
   const bitmap=await createImageBitmap(source,{resizeWidth:Math.min(1280,source.naturalWidth)});
   if(!alive.current){bitmap.close();return;}
   worker.current??=new Worker(new URL('../lib/face-landmarks.worker.ts',import.meta.url),{type:'module'});
   const result=await new Promise<{points:FacePoint[]|null;error:string|null}>((resolve,reject)=>{
    const w=worker.current!;const timer=setTimeout(()=>{w.terminate();if(worker.current===w)worker.current=null;cancel.current=null;reject(Error('El ajuste tardó demasiado. Usa los controles manuales.'));},45000);
    cancel.current=()=>{clearTimeout(timer);reject(Error('Ajuste cancelado.'));};
    w.onmessage=e=>{if(e.data.id!==id)return;clearTimeout(timer);cancel.current=null;resolve(e.data);};w.onerror=()=>{clearTimeout(timer);cancel.current=null;w.terminate();if(worker.current===w)worker.current=null;reject(Error('No pudimos iniciar el ajuste en este dispositivo. Usa los controles manuales.'));};
    w.postMessage({id,bitmap,origin:window.location.origin},[bitmap]);
   });
   if(!alive.current||job.current!==id)return;
   if(!result.points||!stage.current)throw Error(result.error??'Mira de frente, con buena luz y sin anteojos.');
   const rect=stage.current.getBoundingClientRect(),placement=facePlacement(result.points,dimensions,rect);
   if(!placement)throw Error('Necesitamos una foto más frontal. También puedes ajustar el marco manualmente.');
   setPosition(placement);setMessage('Marco alineado con tus ojos. Puedes afinar la posición y el tamaño.');
  }catch(e){if(alive.current&&job.current===id){setMessage('');setError(e instanceof Error?e.message:'No pudimos ajustar el marco. Usa los controles.');}}
  finally{if(job.current===id){adjusting.current=false;if(alive.current)setBusy(false);}}
 }
 function clear(){job.current++;cancel.current?.();cancel.current=null;worker.current?.terminate();worker.current=null;adjusting.current=false;stopCamera();setPhoto(null);setPosition(START);setShowFrame(true);setError('');setMessage('');setBusy(false);if(input.current)input.current.value='';}
 return <div className="tryon-grid"><div className="min-w-0"><div ref={stage} className="tryon-stage" aria-label="Prueba de estilo en tu foto">
  {camera?<div className="tryon-camera"><video ref={video} muted playsInline aria-label="Vista previa de tu cámara"/><div><button type="button" onClick={capture} className="btn">Tomar foto</button><button type="button" onClick={stopCamera} className="btn btn-ghost">Cerrar cámara</button></div></div>:photo?<><img ref={image} src={photo} alt="Tu foto, visible solo en este dispositivo" className="tryon-face" onLoad={()=>{void alignFace();}}/>{showFrame&&frame&&<div className="tryon-frame" style={{left:`${position.x}%`,top:`${position.y}%`,width:`${position.width}%`,transform:`translate(-50%,-50%) rotate(${position.rotation}deg)`}} onPointerDown={e=>{if(busy)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={startX:e.clientX,startY:e.clientY,x:position.x,y:position.y};}} onPointerMove={e=>{if(!drag.current||!stage.current)return;const rect=stage.current.getBoundingClientRect(),d=drag.current;setPosition(p=>({...p,x:Math.max(0,Math.min(100,d.x+(e.clientX-d.startX)/rect.width*100)),y:Math.max(0,Math.min(100,d.y+(e.clientY-d.startY)/rect.height*100))}));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><img src={frame.url} alt={`Vista aproximada de ${frame.name}`} draggable={false}/></div>}</>:<div className="tryon-empty"><span className="eyebrow">Probador de marcos</span>{frame&&<img src={frame.url} alt={`Frontal retocado de ${frame.name}`} className="tryon-preview"/>}<p>Elige tu foto.<br/>El marco se alinea con tu rostro.</p></div>}
  {!camera&&<p className="tryon-stage-note">{frame?.name??'Elige un marco'} · vista aproximada con imagen retocada</p>}
 </div><p className="rx-help">Prueba de aspecto, sin medidas de DP ni altura de montaje. El ajuste físico y el color se comprueban por separado.</p></div>
 <div className="tryon-controls"><h2 className="text-3xl">Mírate con tus favoritos.</h2><p className="mt-4 text-sm text-muted">Foto de frente, con buena luz y sin anteojos. El ajuste se procesa en tu dispositivo; tu foto no se sube a la tienda.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={()=>{void startCamera();}} className="btn" disabled={busy||camera}>Usar mi cámara</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={()=>input.current?.click()}>Elegir foto</button></div><input ref={input} aria-label="Foto de rostro para prueba privada" className="mt-4 w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void choose(e.target.files?.[0]);}}/><p className="rx-help">JPG, PNG o WebP · hasta 8 MB. No guardamos una copia.</p>
 <fieldset className="mt-7"><legend className="rx-label">Tu marco</legend><div className="tryon-products">{frames.map(f=><button type="button" key={f.slug} aria-pressed={f.slug===frame?.slug} onClick={()=>setSelected(f.slug)}><img src={f.url} alt=""/><strong>{f.name}</strong><small>{f.color}</small></button>)}</div></fieldset>
 {frame&&<Link href={`/marcos/${frame.slug}`} className="rx-change">Ver detalles de {frame.name} →</Link>}
 {photo&&<><button type="button" onClick={()=>{void alignFace();}} disabled={busy} className="btn btn-ghost mt-5 w-full">{busy?'Ajustando…':'Volver a alinear con mi rostro'}</button><details className="mt-5"><summary className="cursor-pointer py-3 text-sm underline">Ajustar posición y tamaño</summary><fieldset disabled={busy} className="space-y-3">{([['x','Horizontal',0,100,'%'],['y','Altura visual',0,100,'%'],['width','Tamaño',10,100,'%'],['rotation','Giro',-30,30,'°']] as const).map(([key,label,min,max,unit])=><label key={key} className="block text-xs"><span className="flex justify-between"><span>{label}</span><output>{Math.round(position[key])}{unit}</output></span><input type="range" aria-label={label} min={min} max={max} value={position[key]} onChange={e=>setPosition(p=>({...p,[key]:Number(e.target.value)}))} className="mt-2 min-h-8 w-full"/></label>)}</fieldset></details><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={showFrame} onChange={e=>setShowFrame(e.target.checked)}/>Ver con marco</label></>}
 {message&&<p role="status" className="rx-help">{message}</p>}{error&&<p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}<button type="button" onClick={clear} disabled={!photo&&!camera} className="rx-change">Quitar mi foto y cerrar cámara</button>
 <p className="rx-help">El probador utiliza frontales retocados de tus marcos de muestra. No simula la visión a través del cristal ni verifica la talla.</p>
 </div></div>;
}
