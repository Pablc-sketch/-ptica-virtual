"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef, type PointerEvent} from 'react';
import {TryOnFrameImage} from './tryon-frame-image';
import type {TryOnFrame} from '@/lib/tryon-catalog';
import type {FacePlacement} from '@/lib/face-placement';

// Keep pointer movement outside React; commit once when the gesture finishes.
export function TryOnOverlay({frame,position,disabled,onMove}:{
 frame:TryOnFrame;position:FacePlacement;disabled:boolean;onMove:(p:FacePlacement)=>void;
}){
 const gesture=useRef<{id:number;startX:number;startY:number;width:number;height:number;initial:FacePlacement;next:FacePlacement}|null>(null);
 const pending=useRef<number|null>(null);
 useEffect(()=>()=>{if(pending.current!==null)cancelAnimationFrame(pending.current);},[]);
 function finish(e:PointerEvent<HTMLDivElement>){
  const g=gesture.current;if(!g||g.id!==e.pointerId)return;
  if(pending.current!==null){cancelAnimationFrame(pending.current);pending.current=null;}
  gesture.current=null;onMove(g.next);
 }
 return <div className="tryon-frame" role="img" aria-label={`Marco ${frame.name}, ${frame.color}. Arrastra para ajustar o usa los controles de posición.`}
  style={{left:`${position.x}%`,top:`${position.y}%`,width:`${position.width}%`,transform:`translate(-50%,-50%) rotate(${position.rotation}deg)`}}
  onPointerDown={e=>{
   if(disabled||!e.isPrimary||e.button!==0)return;
   const rect=e.currentTarget.parentElement!.getBoundingClientRect();
   e.currentTarget.setPointerCapture(e.pointerId);
   gesture.current={id:e.pointerId,startX:e.clientX,startY:e.clientY,width:rect.width,height:rect.height,initial:position,next:position};
  }}
  onPointerMove={e=>{
   const g=gesture.current;if(!g||g.id!==e.pointerId)return;
   g.next={...g.initial,x:Math.max(0,Math.min(100,g.initial.x+(e.clientX-g.startX)/g.width*100)),y:Math.max(0,Math.min(100,g.initial.y+(e.clientY-g.startY)/g.height*100))};
   if(pending.current!==null)return;
   const element=e.currentTarget;
   pending.current=requestAnimationFrame(()=>{pending.current=null;if(gesture.current){element.style.left=`${gesture.current.next.x}%`;element.style.top=`${gesture.current.next.y}%`;}});
  }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
  <TryOnFrameImage key={`${frame.id}:${frame.url}`} frame={frame}/>
 </div>;
}
