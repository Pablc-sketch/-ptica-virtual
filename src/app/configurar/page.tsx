import type { Metadata } from "next";
import { LensEstimator } from "@/components/lens-estimator";

export const metadata: Metadata = { title: "Arma tus lentes", description: "Elige el par que necesitas y compara opciones de cristales. Marco y lente básico desde $28.000." };
export default function ConfigurarPage() {
  return <main className="container-page py-10 md:py-16"><div className="rx-heading"><p className="eyebrow">Cristales y receta</p><h1>Arma tus lentes.</h1><p>Para lejos, para cerca o para ambos. Elige tus cristales y envía la receta para confirmar tu par.</p></div><LensEstimator /></main>;
}
