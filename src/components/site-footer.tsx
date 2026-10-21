import Link from "next/link";
import { Brand } from "@/components/brand";
export function SiteFooter() {
 return <footer className="site-footer"><div className="container-page">
  <div className="footer-top"><p className="footer-motto">Una mirada propia.<br />Todos los días.</p><Link href="/marcos" className="arrow-link">Encuentra tu marco <span aria-hidden="true">↗</span></Link></div>
  <div className="footer-grid">
   <div><Link href="/" aria-label="Óptica Global, inicio"><Brand /></Link><p>Elige el marco a tu ritmo. Los cristales se cotizan contigo, después de revisar tu receta.</p></div>
   <nav aria-label="Pie"><Link href="/marcos">Marcos</Link><Link href="/mi-cuenta">Mi cuenta</Link><Link href="/cristales">Cristales</Link><Link href="/ayuda">Ayuda</Link><Link href="/como-funciona">Cómo funciona</Link><Link href="/privacidad">Privacidad (borrador)</Link></nav>
   <p>Las imágenes marcadas como conceptuales son ilustrativas y no representan productos a la venta. El visor 3D no es un probador facial ni garantiza el ajuste.</p>
  </div>
  <div className="footer-bottom"><span>Óptica Global / Santiago, Chile</span><span>Tu estilo. Tu receta. Tu ritmo.</span></div>
 </div></footer>;
}
