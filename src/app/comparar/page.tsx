import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareWorkspace } from "@/components/compare-workspace";
export const metadata: Metadata = { title:"Comparar marcos" };
export default function CompararPage() {
  return <main className="container-page"><div className="page-heading"><div><p className="eyebrow">Menos dudas. Más perspectiva.</p><h1>Compara tus marcos.</h1></div><p className="heading-note">Hasta tres modelos, con sus datos reales. Los campos que aún no están informados se muestran como tales.</p></div><Suspense fallback={<p role="status">Cargando la comparación…</p>}><CompareWorkspace/></Suspense></main>;
}
