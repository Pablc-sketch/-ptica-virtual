"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useState} from 'react';
import {cutoutWhite} from '@/lib/tryon-cutout';
import type {TryOnFrame} from '@/lib/tryon-catalog';

export function TryOnFrameImage({frame}:{frame:TryOnFrame}){
 const [result,setResult]=useState<{url:string;value:string} | null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(frame.prepared)return;
  let cancelled=false,objectUrl:string|undefined;
  const source=new Image();source.crossOrigin='anonymous';
  source.onerror=()=>{if(!cancelled)setFailed(true);};
  source.onload=()=>{
   if(cancelled)return;
   try{
    const scale=Math.min(1,1200/source.naturalWidth),width=Math.round(source.naturalWidth*scale),height=Math.round(source.naturalHeight*scale);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas');
    ctx.drawImage(source,0,0,width,height);
    const pixels=ctx.getImageData(0,0,width,height),box=cutoutWhite(pixels.data,width,height);ctx.putImageData(pixels,0,0);
    const cropped=document.createElement('canvas');cropped.width=box.width;cropped.height=box.height;
    const out=cropped.getContext('2d');if(!out)throw Error('canvas');
    out.drawImage(canvas,box.x,box.y,box.width,box.height,0,0,box.width,box.height);
    cropped.toBlob(blob=>{
     if(cancelled)return;
     if(!blob){setFailed(true);return;}
     objectUrl=URL.createObjectURL(blob);setResult({url:frame.url,value:objectUrl});
    },'image/png');
   }catch{if(!cancelled)setFailed(true);}
  };
  source.src=frame.url;
  return()=>{cancelled=true;source.onload=null;source.onerror=null;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[frame.url,frame.prepared]);
 const url=frame.prepared?frame.url:result?.url===frame.url?result.value:null;
 if(failed)return <span role="alert">No pudimos preparar este frontal. Elige otro color o modelo.</span>;
 if(!url)return <span role="status">Preparando frontal…</span>;
 return <img src={url} alt={`Vista aproximada de ${frame.name}, ${frame.color}`} draggable={false}/>;
}
