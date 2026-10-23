"use client";
/* Local images and camera frames stay in memory. The worker emits coordinates, never medical measurements. */
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {facePlacement,eyePlacement,photoPoint,stagePoint,type FacePoint} from '@/lib/face-placement';
import {initialTryOnFrame,type TryOnFrame} from '@/lib/tryon-catalog';
import {prepareTryOnImage} from '@/lib/tryon-image';
const START={x:50,y:40,width:64,rotation:0};
export function PhotoTryOn({frames,initialSlug,initialColor}:{frames:TryOnFrame[];initialSlug?:string;initialColor?:string}) {
 const [photo,setPhoto]=useState<string|null>(null),[selected,setSelected]=useState(()=>initialTryOnFrame(frames,initialSlug,initialColor)?.key??'');
 const [position,setPosition]=useState(START),[showFrame,setShowFrame]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[camera,setCamera]=useState(false);
 const [marking,setMarking]=useState(false),[marks,setMarks]=useState<FacePoint[]>([]),[stageSize,setStageSize]=useState({width:1,height:1}),[photoSize,setPhotoSize]=useState({width:1,height:1});
 const geometry=useRef<{points:FacePoint[];manual:boolean;image:{width:number;height:number}}|null>(null);
 const frame=frames.find(f=>f.key===selected)??frames[0];
 const [overlay,setOverlay]=useState<{source:string;url:string}|null>(null);
 const [overlayError,setOverlayError]=useState('');
 const overlayCache=useRef(new Map<string,string>());
 const models=Array.from(new Map(frames.map(f=>[f.slug,f])).values());
 const colors=frames.filter(f=>f.slug===frame?.slug);
 const overlayUrl=frame?.prepared?frame.url:overlay?.source===frame?.url?overlay.url:null;
 useEffect(()=>{
  if(!frame||frame.prepared)return;
  let cancelled=false;
  const source=frame.url,cached=overlayCache.current.get(source);
  const picture=new Image();picture.crossOrigin='anonymous';
  picture.onload=()=>{if(cancelled)return;try{const url=cached??prepareTryOnImage(picture,frame.optical,frame.slug);overlayCache.current.set(source,url);setOverlay({source,url});setOverlayError('');}catch{setOverlayError('No pudimos preparar este marco. Vuelve a elegirlo o prueba otro color.');}};
  picture.onerror=()=>{if(!cancelled)setOverlayError('No pudimos cargar este marco. Intenta nuevamente.');};
  picture.src=source;
  return()=>{cancelled=true;picture.onload=null;picture.onerror=null;};
 },[frame]);
 function selectFrame(next:TryOnFrame){setSelected(next.key);const u=new URL(window.location.href);u.searchParams.set('marco',next.slug);if(next.variantId)u.searchParams.set('color',next.variantId);else u.searchParams.delete('color');window.history.replaceState(window.history.state,'',u);}
 const stage=useRef<HTMLDivElement>(null),image=useRef<HTMLImageElement>(null),video=useRef<HTMLVideoElement>(null),input=useRef<HTMLInputElement>(null);
 const worker=useRef<Worker|null>(null),stream=useRef<MediaStream|null>(null),alive=useRef(true),opening=useRef(false),adjusting=useRef(false),job=useRef(0);
 const drag=useRef<{startX:number;startY:number;x:number;y:number}|null>(null),cancel=useRef<(()=>void)|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cancel.current?.();worker.current?.terminate();stream.current?.getTracks().forEach(t=>t.stop());};},[]);
 useEffect(()=>()=>{if(photo?.startsWith('blob:'))URL.revokeObjectURL(photo);},[photo]);
 useEffect(()=>{if(!stage.current)return;const observer=new ResizeObserver(([entry])=>{const size={width:entry.contentRect.width,height:entry.contentRect.height};setStageSize(size);const g=geometry.current;if(g){const placed=(g.manual?eyePlacement:facePlacement)(g.points,g.image,size);if(placed)setPosition(placed);}});observer.observe(stage.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(camera&&video.current){video.current.srcObject=stream.current;void video.current.play().catch(()=>setError('No se pudo mostrar la cámara. Puedes subir una foto.'));}},[camera]);
 function stopCamera(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera(false);}
 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){setError('La cámara no está disponible en este navegador. Puedes subir una foto.');return;}
  setError('');
  try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:1280}},audio:false});if(!alive.current){s.getTracks().forEach(t=>t.stop());return;}stream.current?.getTracks().forEach(t=>t.stop());stream.current=s;setCamera(true);}
  catch{if(alive.current)setError('No se pudo abrir la cámara. Revisa su permiso o elige una foto.');}
 }
 function capture(){const v=video.current;if(!v?.videoWidth)return;const canvas=document.createElement('canvas');const scale=Math.min(1,1600/v.videoWidth);canvas.width=Math.round(v.videoWidth*scale);canvas.height=Math.round(v.videoHeight*scale);canvas.getContext('2d')?.drawImage(v,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(blob&&alive.current){geometry.current=null;setMarks([]);setMarking(false);setPhoto(URL.createObjectURL(blob));setPosition(START);setMessage('');}},'image/jpeg',.92);stopCamera();}
 async function choose(file:File|undefined){
  if(!file||opening.current)return;setError('');setMessage('');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>8*1024*1024){setError('Elige un JPG, PNG o WebP de hasta 8 MB. Convierte las fotos HEIC antes de usarlas.');if(input.current)input.current.value='';return;}
  opening.current=true;setBusy(true);
  try{const bitmap=await createImageBitmap(file),tooLarge=bitmap.width*bitmap.height>25000000;bitmap.close();if(!alive.current)return;if(tooLarge){setError('Usa una imagen de hasta 25 megapíxeles.');return;}stopCamera();geometry.current=null;setMarks([]);setMarking(false);setPhoto(URL.createObjectURL(file));setPosition(START);}
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
   geometry.current={points:result.points,manual:false,image:dimensions};setMarks([result.points[468],result.points[473]]);setMarking(false);setPosition(placement);setMessage('Marco alineado con tus ojos. Puedes afinar la posición y el tamaño.');
  }catch(e){if(alive.current&&job.current===id){setMessage('');setError(e instanceof Error?e.message:'No pudimos ajustar el marco. Usa los controles.');}}
  finally{if(job.current===id){adjusting.current=false;if(alive.current)setBusy(false);}}
 }
 function applyMarks(){if(!image.current||!stage.current)return;const dimensions={width:image.current.naturalWidth,height:image.current.naturalHeight};const placed=eyePlacement(marks,dimensions,stage.current.getBoundingClientRect());if(!placed){setError('Marca el centro de cada pupila en una foto de frente.');return;}geometry.current={points:marks,manual:true,image:dimensions};setPosition(placed);setMarking(false);setError('');setMessage('Posición ajustada con tus dos marcas.');}
 function clear(){geometry.current=null;setMarks([]);setMarking(false);job.current++;cancel.current?.();cancel.current=null;worker.current?.terminate();worker.current=null;adjusting.current=false;stopCamera();setPhoto(null);setPosition(START);setShowFrame(true);setError('');setMessage('');setBusy(false);if(input.current)input.current.value='';}
 return <div className="tryon-grid"><div className="min-w-0"><div ref={stage} className={`tryon-stage ${marking?'is-marking':''}`} aria-label="Prueba de estilo en tu foto" onPointerDown={e=>{if(!marking||busy||!image.current||!stage.current||e.target instanceof Element&&e.target.closest('button'))return;const rect=stage.current.getBoundingClientRect();const p=photoPoint({x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height},{width:image.current.naturalWidth,height:image.current.naturalHeight},rect);if(p)setMarks(v=>v.length<2?[...v,p]:[p]);}}>
  {camera?<div className="tryon-camera"><video ref={video} muted playsInline aria-label="Vista previa de tu cámara"/><div><button type="button" onClick={capture} className="btn">Tomar foto</button><button type="button" onClick={stopCamera} className="btn btn-ghost">Cerrar cámara</button></div></div>:photo?<><img ref={image} src={photo} alt={photo.startsWith('/tryon/')?'Modelo digital de demostración':'Tu foto, visible solo en este dispositivo'} className="tryon-face" onLoad={e=>{setPhotoSize({width:e.currentTarget.naturalWidth,height:e.currentTarget.naturalHeight});void alignFace();}}/>{showFrame&&!marking&&frame&&overlayUrl&&<div className="tryon-frame" style={{left:`${position.x}%`,top:`${position.y}%`,width:`${position.width}%`,transform:`translate(-50%,-50%) rotate(${position.rotation}deg)`}} onPointerDown={e=>{if(busy)return;geometry.current=null;e.currentTarget.setPointerCapture(e.pointerId);drag.current={startX:e.clientX,startY:e.clientY,x:position.x,y:position.y};}} onPointerMove={e=>{if(!drag.current||!stage.current)return;const rect=stage.current.getBoundingClientRect(),d=drag.current;setPosition(p=>({...p,x:Math.max(0,Math.min(100,d.x+(e.clientX-d.startX)/rect.width*100)),y:Math.max(0,Math.min(100,d.y+(e.clientY-d.startY)/rect.height*100))}));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><img src={overlayUrl!} alt={`${frame.name}, ${frame.color}`} draggable={false}/></div>}{marking&&marks.map((p,i)=>{const pos=stagePoint(p,photoSize,stageSize);return <button type="button" key={i} className="eye-marker" style={{left:`${pos.x*100}%`,top:`${pos.y*100}%`}} aria-label={`Marca de pupila ${i+1}. Usa las flechas para ajustar.`} onKeyDown={e=>{const delta={ArrowLeft:[-.002,0],ArrowRight:[.002,0],ArrowUp:[0,-.002],ArrowDown:[0,.002]}[e.key];if(!delta)return;e.preventDefault();setMarks(old=>old.map((p,j)=>i===j?{x:Math.max(0,Math.min(1,p.x+delta[0])),y:Math.max(0,Math.min(1,p.y+delta[1]))}:p));}}>{i+1}</button>;})}</>:<div className="tryon-empty"><span className="eyebrow">Probador de marcos</span>{frame&&<img src={frame.url} alt={`Marco ${frame.name}`} className="tryon-preview"/>}<p>Elige tu foto.<br/>El marco se alinea con tu rostro.</p></div>}
  {!camera&&<p className="tryon-stage-note">{frame?.name??'Elige un marco'} · prueba de estilo</p>}
 </div><details className="tryon-about"><summary>Acerca de esta vista</summary><p>Elige tu marco y ajusta su posición sobre la foto con los controles.</p></details></div>
 <div className="tryon-controls"><h2 className="text-3xl">Mírate con tus favoritos.</h2><p className="mt-4 text-sm text-muted">Foto de frente, con buena luz y sin anteojos. Tu foto se procesa en este dispositivo.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={()=>{void startCamera();}} className="btn" disabled={busy||camera}>Usar mi cámara</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={()=>input.current?.click()}>Elegir foto</button></div><input ref={input} aria-label="Foto de rostro para prueba privada" className="mt-4 w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void choose(e.target.files?.[0]);}}/><p className="rx-help">JPG, PNG o WebP · hasta 8 MB.</p>
 <fieldset className="demo-faces"><legend className="rx-label">O prueba con un modelo</legend><div>{[1,2,3].map(i=><button type="button" key={i} disabled={busy} aria-label={`Probar con modelo ${i}`} aria-pressed={photo===`/tryon/modelo-${i}.webp`} onClick={()=>{const src=`/tryon/modelo-${i}.webp`;if(photo===src){void alignFace();return;}clear();setPhoto(src);}}><img src={`/tryon/modelo-${i}.webp`} alt="" loading="lazy"/></button>)}</div><p className="rx-help">Modelos digitales de demostración.</p></fieldset><fieldset className="mt-7 tryon-model-picker"><legend className="rx-label">Tu marco</legend>
 <label className="block text-sm" htmlFor="tryon-model">Modelo</label><select id="tryon-model" className="field mt-2" value={frame?.slug??''} onChange={e=>{const next=frames.find(f=>f.slug===e.target.value);if(next)selectFrame(next);}}>{models.map(f=><option value={f.slug} key={f.slug}>{f.name}</option>)}</select>
 <div className="tryon-products" role="group" aria-label="Colores del marco">{colors.map(f=><button type="button" key={f.key} aria-label={f.name+', '+f.color} aria-pressed={f.key===frame?.key} onClick={()=>selectFrame(f)}><img src={f.url} alt=""/><small>{f.color||f.name}</small></button>)}</div>
 {!overlayUrl&&!frame?.prepared&&!overlayError&&<p role="status" className="rx-help">Preparando {frame?.name}…</p>}{overlayError&&<p role="alert" className="rx-help">{overlayError}</p>}
 </fieldset>
 {frame&&<Link href={`/marcos/${frame.slug}${frame.variantId?`?color=${frame.variantId}`:""}`} className="rx-change">Ver detalles de {frame.name} →</Link>}
 {photo&&<><button type="button" className="btn btn-ghost mt-4 w-full" disabled={busy} onClick={()=>{setMarking(v=>!v);setError('');}}>{marking?'Volver al marco':'Marcar mis ojos'}</button>{marking&&<div className="eye-marking-help"><p>{marks.length<2?`Toca el centro de ${marks.length===0?'una pupila y luego la otra':'la otra pupila'} en tu foto.`:'Puedes afinar las marcas con las flechas del teclado.'}</p><button type="button" className="btn" disabled={marks.length!==2} onClick={applyMarks}>Ajustar con estas marcas</button><button type="button" className="rx-change" onClick={()=>setMarks([])}>Volver a marcar</button></div>}<button type="button" onClick={()=>{void alignFace();}} disabled={busy} className="btn btn-ghost mt-5 w-full">{busy?'Ajustando…':'Volver a alinear con mi rostro'}</button><details className="mt-5"><summary className="cursor-pointer py-3 text-sm underline">Ajustar posición y tamaño</summary><fieldset disabled={busy} className="space-y-3">{([['x','Horizontal',0,100,'%'],['y','Altura visual',0,100,'%'],['width','Tamaño',10,100,'%'],['rotation','Giro',-30,30,'°']] as const).map(([key,label,min,max,unit])=><label key={key} className="block text-xs"><span className="flex justify-between"><span>{label}</span><output>{Math.round(position[key])}{unit}</output></span><input type="range" aria-label={label} min={min} max={max} value={position[key]} onChange={e=>{geometry.current=null;setPosition(p=>({...p,[key]:Number(e.target.value)}));}} className="mt-2 min-h-8 w-full"/></label>)}</fieldset></details><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={showFrame} onChange={e=>setShowFrame(e.target.checked)}/>Ver con marco</label></>}
 {message&&<p role="status" className="rx-help">{message}</p>}{error&&<p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}<button type="button" onClick={clear} disabled={!photo&&!camera} className="rx-change">Quitar mi foto y cerrar cámara</button>

 </div></div>;
}
