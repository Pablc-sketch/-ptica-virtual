"use client";
import {useFormStatus} from 'react-dom';

export function CheckoutSubmit({enabled}:{enabled:boolean}){
 const {pending}=useFormStatus();
 return <button className="btn btn-mp" disabled={!enabled||pending} aria-disabled={!enabled||pending}>
  {pending?'Abriendo Mercado Pago…':'Pagar con Mercado Pago'}
 </button>;
}
