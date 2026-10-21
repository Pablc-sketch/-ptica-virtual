import { NextResponse } from "next/server";
import { parseComparisonQuery } from "@/lib/compare-query";
import { getComparisonProducts } from "@/lib/catalog";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request) {
  const ids=parseComparisonQuery(new URL(request.url).searchParams.get("ids"));
  if (!ids) return NextResponse.json({error:"Elige entre uno y tres marcos válidos."},{status:400,headers});
  try { return NextResponse.json(await getComparisonProducts(ids),{headers}); }
  catch { return NextResponse.json({error:"No pudimos cargar los datos actuales de los marcos. Tu comparación sigue guardada."},{status:503,headers}); }
}
