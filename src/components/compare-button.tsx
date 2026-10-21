"use client";
import { useState } from "react";
import { COMPARE_LIMIT, toggleComparison, useComparison } from "@/lib/compare-store";

export function CompareButton({id}:{id:string}) {
  const ids = useComparison();
  const selected = ids.includes(id);
  const [notice,setNotice] = useState("");
  return <span className="compare-control"><button type="button" className="compare-toggle" aria-pressed={selected} aria-disabled={!selected && ids.length>=COMPARE_LIMIT} onClick={()=>{setNotice(toggleComparison(id)==="limit" ? "Puedes comparar hasta 3 marcos. Quita uno para agregar otro." : "");}}><svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="2" y="3" width="6" height="14" rx="1"/><rect x="12" y="3" width="6" height="14" rx="1"/></svg>{selected ? "En el comparador ✓" : "Comparar marco"}</button>{notice && <span role="status" className="compare-notice">{notice}</span>}</span>;
}
