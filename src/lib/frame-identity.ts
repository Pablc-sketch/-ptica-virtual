// Offline review only. A color/name/photo resemblance never establishes model identity.
export type FrameIdentity={
 modelReference?:string; manufacturer?:string; shape?:string; material?:string;
 construction?:string; bridgeDesign?:string; hingeDesign?:string;
 lensWidthMm?:number; bridgeMm?:number; templeMm?:number;
 evidenceVerified?:boolean;
};
const TEXT=['manufacturer','modelReference','shape','material','construction','bridgeDesign','hingeDesign'] as const;
const SIZE=['lensWidthMm','bridgeMm','templeMm'] as const;
const norm=(s:string)=>s.trim().toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu,'');
export function compareFrameIdentity(a:FrameIdentity,b:FrameIdentity):{decision:'separate'|'review'|'same-model';reasons:string[]}{
 const differences:string[]=[],missing:string[]=[];
 for(const key of TEXT){
  if(!a[key]?.trim()||!b[key]?.trim())missing.push(key);
  else if(norm(a[key]!)!==norm(b[key]!))differences.push(key);
 }
 for(const key of SIZE){
  if(!Number.isFinite(a[key])||!Number.isFinite(b[key])||a[key]!<=0||b[key]!<=0)missing.push(key);
  else if(a[key]!==b[key])differences.push(key);
 }
 if(differences.length)return {decision:'separate',reasons:differences};
 if(!a.evidenceVerified||!b.evidenceVerified)missing.push('verified-evidence');
 return missing.length?{decision:'review',reasons:missing}:{decision:'same-model',reasons:[]};
}
