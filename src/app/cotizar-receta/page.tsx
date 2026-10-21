import type { Metadata } from "next";
import { LensEstimator } from "@/components/lens-estimator";

export const metadata: Metadata = { title: "Cotiza según tu receta", description: "Consulta una estimación de tus cristales según la graduación, con revisión profesional antes de fabricar." };
export default function CotizarRecetaPage() {
  return <main className="container-page py-10 md:py-16"><div className="mb-10 max-w-3xl"><p className="eyebrow">Cada receta tiene sus opciones</p><h1 className="mt-4 text-[clamp(38px,6vw,70px)]">Cotiza con tus datos.</h1><p className="mt-5 max-w-xl text-muted">Consulta las tarifas de cristales según tu graduación. Después revisamos el documento original y confirmamos el marco, la fabricación y el total del par.</p></div><LensEstimator /></main>;
}
