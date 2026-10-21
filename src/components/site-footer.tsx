import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-sage/40">
      <div className="container-page grid gap-8 py-12 text-sm sm:grid-cols-3">
        <div>
          <p className="font-serif text-xl tracking-[0.1em]">ÓPTICA GLOBAL</p>
          <p className="mt-2 max-w-xs text-muted">
            Marcos ópticos con fotografías reales. El precio publicado corresponde solo al marco; los
            cristales se cotizan aparte con tu receta.
          </p>
        </div>
        <nav aria-label="Pie" className="flex flex-col gap-1">
          <Link href="/marcos">Marcos</Link>
          <Link href="/cristales">Cristales</Link>
          <Link href="/como-funciona">Cómo funciona</Link>
          <Link href="/ayuda">Ayuda</Link>
        </nav>
        <p className="text-muted">
          Las imágenes marcadas como “conceptual” son ilustrativas y no representan un producto a la
          venta. El visor 3D no es un probador facial ni garantiza el ajuste.
        </p>
      </div>
    </footer>
  );
}
