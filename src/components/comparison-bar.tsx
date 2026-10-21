"use client";
import Link from "next/link";
import { clearComparison, useComparison } from "@/lib/compare-store";
export function ComparisonBar() {
  const ids = useComparison();
  if (!ids.length) return null;
  return <aside className="comparison-bar" aria-label="Marcos para comparar"><div><strong>{ids.length} de 3 marcos</strong><span>Materiales, medidas y precios lado a lado.</span></div><Link href="/comparar" className="btn">Comparar <span aria-hidden="true">↗</span></Link><button className="comparison-clear" type="button" onClick={clearComparison}>Vaciar</button></aside>;
}
