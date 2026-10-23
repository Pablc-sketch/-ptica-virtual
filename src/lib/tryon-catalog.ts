import type { CatalogProduct } from "./catalog-types";
export type TryOnFrame={key:string;slug:string;name:string;color:string;url:string;variantId?:string;optical:boolean;prepared?:boolean};
const LEGACY:Record<string,string>={"ovalo-negro":"ovalo","cat-eye-ambar":"ambar","cat-eye-mosaico":"mosaico"};
export function buildTryOnFrames(products:CatalogProduct[]):TryOnFrame[]{
  return products.flatMap((p):TryOnFrame[]=>{
    const common={slug:p.slug,name:p.name,optical:p.use!=="solar"};
    if(p.variants?.length)return p.variants.flatMap(v=>v.front?[{...common,key:p.slug+":"+v.id,variantId:v.id,color:v.name,url:v.front.url}]:[]);
    const legacy=LEGACY[p.slug];
    if(legacy)return [{...common,key:p.slug,color:p.color??"",url:"/products/tryon-"+legacy+".webp",prepared:true}];
    return p.images[0]?[{...common,key:p.slug,color:p.color??"",url:p.images[0].url}]:[];
  });
}
export function initialTryOnFrame(frames:TryOnFrame[],slug?:string,color?:string){
  return frames.find(f=>f.slug===slug&&(!color||f.variantId===color))??frames.find(f=>f.slug===slug)??frames[0];
}
