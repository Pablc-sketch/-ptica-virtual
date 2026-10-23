import Link from "next/link";
import {createClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
async function logout(){"use server";const supabase=await createClient();const {error}=await supabase.auth.signOut();if(error)throw new Error('No se pudo cerrar la sesión');redirect('/admin/login');}


export function AdminNav() {
  return (
    <nav aria-label="Administración" className="mb-8 flex flex-wrap gap-2 border-b border-line pb-3 text-sm">
      <Link href="/admin" className="flex min-h-11 items-center px-3 hover:bg-sage">Resumen</Link>
      <Link href="/admin/productos" className="flex min-h-11 items-center px-3 hover:bg-sage">Marcos</Link>
      <Link href="/admin/cotizaciones" className="flex min-h-11 items-center px-3 hover:bg-sage">Cotizaciones</Link>
      <Link href="/admin/recetas" className="flex min-h-11 items-center px-3 hover:bg-sage">Recetas</Link>
    <form action={logout} className="ml-auto"><button className="min-h-11 px-3 underline">Cerrar sesión</button></form></nav>
  );
}
