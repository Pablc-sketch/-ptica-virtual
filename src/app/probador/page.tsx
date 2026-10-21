import type { Metadata } from "next";
import Link from "next/link";
import { PhotoTryOn } from "@/components/photo-try-on";

export const metadata: Metadata = { title: "Prueba de estilo en tu foto", description: "Compara siluetas sobre una foto en tu navegador, con controles de posición, tamaño y giro." };
export default function ProbadorPage() {
  return <main className="container-page py-10 md:py-16"><div className="mb-9 max-w-3xl"><p className="eyebrow">Otra forma de mirarte</p><h1 className="mt-4 text-[clamp(38px,6vw,70px)]">Pruébalo sobre tu foto.</h1><p className="mt-5 max-w-xl text-muted">Explora una forma o añade la imagen frontal de un marco. Una superposición sencilla, sin generar tu rostro ni enviarlo a otro servicio.</p></div><PhotoTryOn /><div className="mt-8 flex flex-wrap gap-3"><Link href="/marcos" className="btn">Explorar marcos</Link><Link href="/configurar" className="btn btn-ghost">Armar mi par</Link></div></main>;
}
