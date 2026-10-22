import Link from "next/link";

export function AdminNav() {
  return (
    <nav aria-label="Administración" className="mb-8 flex flex-wrap gap-2 border-b border-line pb-3 text-sm">
      <Link href="/admin" className="flex min-h-11 items-center px-3 hover:bg-sage">Resumen</Link>
      <Link href="/admin/productos" className="flex min-h-11 items-center px-3 hover:bg-sage">Marcos</Link>
      <Link href="/admin/cotizaciones" className="flex min-h-11 items-center px-3 hover:bg-sage">Cotizaciones</Link>
      <Link href="/admin/recetas" className="flex min-h-11 items-center px-3 hover:bg-sage">Recetas</Link>
      <Link href="/admin/pedidos" className="flex min-h-11 items-center px-3 hover:bg-sage">Pedidos (borradores)</Link>
    </nav>
  );
}
