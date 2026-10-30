"use client";
import {useTransition} from 'react';
import {useRouter} from 'next/navigation';

export function RefreshOrder(){
 const router=useRouter(),[pending,startTransition]=useTransition();
 return <button type="button" className="btn btn-ghost mt-4" disabled={pending}
  onClick={()=>startTransition(()=>router.refresh())}>{pending?'Consultando el pago…':'Actualizar estado del pago'}</button>;
}
