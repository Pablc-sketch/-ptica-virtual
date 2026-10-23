"use client";
import {usePathname} from 'next/navigation';
import {SiteHeader} from './site-header';
import {SiteFooter} from './site-footer';
// Presentation only: every administrative resource keeps its server-side role check.
export function SiteShell({children}:{children:React.ReactNode}) {
 const path=usePathname();const admin=path==='/admin'||path.startsWith('/admin/');
 return <>{!admin&&<SiteHeader/>}<div id="contenido" className="flex-1">{children}</div>{!admin&&<SiteFooter/>}</>;
}
