import Link from "next/link";
import { Brand } from "@/components/brand";
export function SiteFooter() {
 return <footer className="site-footer"><div className="container-page">
  <div className="footer-top"><p className="footer-motto">Visión sin fronteras.</p><Link href="/marcos" className="arrow-link">Encuentra tu marco <span aria-hidden="true">↗</span></Link></div>
  <div className="footer-grid">
   <div><Link href="/" aria-label="Óptica Global, Visión sin fronteras, inicio"><Brand /></Link><p>Elige el marco a tu ritmo. Los cristales se cotizan contigo, después de revisar tu receta.</p></div>
   <nav aria-label="Pie"><Link href="/marcos">Marcos</Link><Link href="/configurar">Arma tus lentes</Link><Link href="/cristales">Cristales y precios</Link><Link href="/probador">Probador</Link><Link href="/mi-cuenta">Mi cuenta</Link><Link href="/comparar">Comparar</Link><Link href="/ayuda">Ayuda</Link><Link href="/como-funciona">Cómo funciona</Link><Link href="/privacidad">Privacidad</Link></nav>
   <p>¿Tienes una receta nueva? Elige tus cristales y adjunta una foto desde tu cuenta.</p>
  </div>
  <div className="footer-bottom"><span>Óptica Global / Santiago, Chile</span><span>Visión sin fronteras</span></div>
 </div></footer>;
}
