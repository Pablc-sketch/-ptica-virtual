"use client";
import {useEffect,useState} from 'react';
const MESSAGES=['Marco + lentes básicos con receta desde $28.000','Tu receta se revisa por un profesional','Pruébate los marcos en tu foto'];
export function AnnouncementStrip(){const [index,setIndex]=useState(0),[paused,setPaused]=useState(false);
useEffect(()=>{if(paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const timer=setInterval(()=>setIndex(i=>(i+1)%MESSAGES.length),6000);return()=>clearInterval(timer);},[paused]);
return <div className="announcement-strip"><button type="button" aria-label="Anuncio anterior" onClick={()=>setIndex(i=>(i+2)%3)}>‹</button><p>{MESSAGES[index]}</p><button type="button" aria-label={paused?'Reanudar anuncios':'Pausar anuncios'} onClick={()=>setPaused(p=>!p)}>{paused?'▶':'Ⅱ'}</button></div>;}
