export type SignedPower = { sign: '' | '+' | '-'; magnitude: string };
export const emptyPower = (): SignedPower => ({sign:'',magnitude:''});
/** ADD must not silently turn distance powers into a near prescription. */
export function requiresNearReview(use:string,additions:SignedPower[]):boolean {
 return use==='near'&&additions.some(a=>a.magnitude.trim()!=='');
}
/** A pasted sign is explicit; never infer a negative cylinder or turn a blank into zero. */
export function editPower(current:SignedPower, raw:string):SignedPower {
 const value=raw.trim().replaceAll('−','-').replaceAll(',','.');
 const sign=value.startsWith('-')?'-':value.startsWith('+')?'+':current.sign;
 return {sign,magnitude:value.replace(/^[+-]/,'')};
}
export function readPower(power:SignedPower):number|null {
 if(!/^\d+(?:\.\d{1,2})?$/.test(power.magnitude)||!power.sign)return null;
 const n=Number(power.magnitude)*(power.sign==='-'?-1:1);
 return Number.isFinite(n)&&Number.isInteger(n*4)?(Object.is(n,-0)?0:n):null;
}
export function formatPower(power:SignedPower):SignedPower {
 return readPower(power)===null?power:{...power,magnitude:Number(power.magnitude).toFixed(2)};
}
export function readAxis(raw:string):number|null {
 return /^\d{1,3}$/.test(raw)&&Number(raw)<=180?Number(raw):null;
}
export function readMillimetres(raw:string):number|null {
 const value=raw.trim().replace(',','.');
 return /^\d{1,2}(?:\.\d)?$/.test(value)&&Number(value)>0?Number(value):null;
}
