"use client";
import {useState, type InputHTMLAttributes} from 'react';
import {cleanText,formatName,mobileDraft} from '@/lib/contact-format';

export function PhoneInput({required=false,defaultValue='',...props}:InputHTMLAttributes<HTMLInputElement>){
  const [value,setValue]=useState(defaultValue ? mobileDraft(String(defaultValue)) : required ? '+569' : '');
  return <input {...props} type="tel" required={required} value={value} inputMode="tel" autoComplete="tel" placeholder="+569 1234 5678" pattern="\+569 [0-9]{4} [0-9]{4}" title="Escribe tu celular chileno: +569 y 8 dígitos" maxLength={30}
    onFocus={()=>{if(!value)setValue('+569');}} onChange={e=>setValue(mobileDraft(e.target.value))} onBlur={()=>{if(!required&&value==='+569')setValue('');}}/>;
}

export function ContactInput({format='text',...props}:InputHTMLAttributes<HTMLInputElement>&{format?:'text'|'name'|'email'|'number'}){
  return <input {...props} onBlur={e=>{const value=cleanText(e.currentTarget.value);e.currentTarget.value=format==='name'?formatName(value):format==='email'?value.toLowerCase():format==='number'?value.toUpperCase():value;props.onBlur?.(e);}}/>;
}
