export const cleanText = (value: string) => value.trim().replace(/\s+/g, ' ');
export function formatName(value: string) {
  return cleanText(value).toLocaleLowerCase('es-CL').split(' ').map((word, i) => !i || !['de','del','la','las','los','y'].includes(word) ? word.replace(/^\p{L}/u, c => c.toLocaleUpperCase('es-CL')) : word).join(' ');
}
export function normalizeMobile(value: string): string | null {
  if (!/^[+\d\s().-]+$/.test(value.trim())) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0056')) digits = digits.slice(2);
  if (/^569\d{8}$/.test(digits)) return `+${digits}`;
  if (/^9\d{8}$/.test(digits)) return `+56${digits}`;
  if (/^\d{8}$/.test(digits)) return `+569${digits}`;
  return null;
}
export function mobileDraft(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00569')) digits = digits.slice(5);
  else if (digits.startsWith('569')) digits = digits.slice(3);
  else if (digits.length === 9 && digits.startsWith('9')) digits = digits.slice(1);
  const local = digits.slice(0, 8);
  return `+569${local ? ` ${local.slice(0,4)}` : ''}${local.length > 4 ? ` ${local.slice(4)}` : ''}`;
}
