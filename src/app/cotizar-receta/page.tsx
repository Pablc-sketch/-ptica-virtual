import type { Metadata } from "next";
import { LensEstimator } from "@/components/lens-estimator";
import {Suspense} from "react";
import {getPublishedProduct} from "@/lib/catalog";

export const metadata: Metadata = { title: "Cotiza según tu receta", description: "Consulta una estimación de tus cristales según la graduación, con revisión profesional antes de fabricar." };
async function Estimator({searchParams}:{searchParams:PageProps<"/cotizar-receta">["searchParams"]}) {
  const query=await searchParams;
  if(typeof query.marco!=="string")return <LensEstimator/>;
  let p;
  try {p=await getPublishedProduct(query.marco);}catch{return <p role="alert">No pudimos consultar el marco. Vuelve al catálogo e inténtalo de nuevo.</p>;}
  if(p?.pairBasePriceClp)return <LensEstimator frame={{name:p.name,slug:p.slug,pairBasePriceClp:p.pairBasePriceClp}}/>;
  return <><p role="status" className="mb-5 text-sm">No encontramos un precio conjunto para ese marco. Puedes consultar los cristales por separado.</p><LensEstimator/></>;
}
export default function CotizarRecetaPage({searchParams}:PageProps<"/cotizar-receta">) {
  return <main className="container-page py-10 md:py-16"><div className="mb-10 max-w-3xl"><p className="eyebrow">Cada receta tiene sus opciones</p><h1 className="mt-4 text-[clamp(38px,6vw,70px)]">Cotiza con tus datos.</h1><p className="mt-5 max-w-xl text-muted">Consulta las opciones para tu graduación. Después revisamos la receta original y confirmamos el total del par.</p></div><Suspense fallback={<p role="status">Consultando tu marco…</p>}><Estimator searchParams={searchParams}/></Suspense></main>;
}
