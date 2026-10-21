const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseComparisonQuery(raw: string | null): string[] | null {
  if (!raw || raw.length>120) return null;
  const values=raw.split(",");
  if (values.some(id=>!UUID.test(id))) return null;
  const ids=[...new Set(values)];
  return ids.length>=1 && ids.length<=3 ? ids : null;
}
