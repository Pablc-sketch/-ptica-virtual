import type { Metadata } from "next";
import { LensGuide } from "@/components/lens-guide";

export const metadata: Metadata = { title: "Arma tus lentes", description: "Elige el par que necesitas y compara opciones de cristales. Marco y cristal blanco desde $28.000." };
export default function ConfigurarPage() {
  return <main className="container-page py-10 md:py-16"><div className="mb-10 max-w-3xl"><p className="eyebrow">A tu manera, paso a paso</p><h1 className="mt-4 text-[clamp(38px,6vw,70px)]">Arma tu próximo par.</h1><p className="mt-5 max-w-xl text-muted">Para cerca. Para lejos. O para ese segundo par que te faltaba. Empieza por lo que buscas y conoce los precios de partida, con tu receta revisada por una persona.</p></div><LensGuide /></main>;
}
