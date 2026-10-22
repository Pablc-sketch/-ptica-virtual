"use client";
import {useRef,useState} from 'react';
import {editPower,formatPower,readPower,type SignedPower} from '@/lib/prescription-input';

/** A choice always includes its sign. Opening the panel never changes the prescription. */
export function PowerField({id,label,value,onChange,help,addition=false}:{id:string;label:string;value:SignedPower;onChange:(v:SignedPower)=>void;help?:string;addition?:boolean}) {
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [sign,setSign]=useState<'+'|'-'>('+'),[manual,setManual]=useState(false);
 const power=readPower(value),invalid=value.magnitude!==''&&power===null;
 const display=power===null?'Elegir':`${power<0?'−':'+'}${Math.abs(power).toFixed(2)}`;
 const values=Array.from({length:addition?17:81},(_,i)=>(i/4).toFixed(2));
 function close(){dialog.current?.close();trigger.current?.focus();}
 function choose(magnitude:string){onChange({sign:magnitude==='0.00'?'+':sign,magnitude});close();}
 return <div className="rx-power-field">
  <label htmlFor={id} className="rx-label">{label}</label>
  <button ref={trigger} type="button" id={id} className="power-trigger" aria-haspopup="dialog" data-invalid={invalid} aria-describedby={help?`${id}-help`:undefined} onClick={()=>{setSign(value.sign||'+');setManual(false);dialog.current?.showModal();}}><span>{display}</span><span aria-hidden="true">⌄</span></button>
  {help&&<p id={`${id}-help`} className="rx-help">{help}</p>}
  <dialog ref={dialog} className="power-dialog" aria-labelledby={`${id}-title`} onClose={()=>trigger.current?.focus()}>
   <header><div><p className="eyebrow">Tu receta</p><h3 id={`${id}-title`}>{label}</h3></div><button type="button" className="power-close" aria-label="Cerrar selector de dioptrías" onClick={close}>×</button></header>
   <p className="rx-help">Elige el mismo signo y número que aparecen en tu receta.</p>
   <div className="power-signs" role="group" aria-label="Signo de la graduación"><button type="button" aria-pressed={sign==='-'} onClick={()=>setSign('-')}>− Negativo</button><button type="button" aria-pressed={sign==='+'} onClick={()=>setSign('+')}>+ Positivo</button></div>
   {!manual?<div className="power-values" role="group" aria-label="Dioptrías">{values.map(v=><button type="button" key={v} aria-pressed={value.magnitude===v&&(v==='0.00'||value.sign===sign)} onClick={()=>choose(v)}>{v==='0.00'?'+':sign==='-'?'−':'+'}{v}</button>)}</div>:<div className="power-manual"><label className="rx-label" htmlFor={`${id}-custom`}>Número de dioptrías</label><div className="rx-power"><select aria-label={`Signo de ${label}`} value={value.sign} onChange={e=>onChange({...value,sign:e.target.value as SignedPower['sign']})}><option value="">±</option><option value="+">+</option><option value="-">−</option></select><input id={`${id}-custom`} inputMode="decimal" placeholder="7.00" value={value.magnitude} onChange={e=>onChange(editPower(value,e.target.value))} onBlur={()=>onChange(formatPower(value))} aria-invalid={invalid}/></div>{invalid&&<p role="status" className="rx-help">Elige un signo y un valor en pasos de 0.25.</p>}<button type="button" className="btn mt-4" disabled={power===null} onClick={close}>Usar {display}</button></div>}
   <footer><button type="button" onClick={()=>setManual(v=>!v)}>{manual?'Ver valores':'Escribir otro valor'}</button><button type="button" onClick={()=>{onChange({sign:'',magnitude:''});close();}}>Dejar vacío</button></footer>
  </dialog>
 </div>;
}
