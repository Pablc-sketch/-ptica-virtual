import type {CatalogProduct} from './catalog-types';

export type TryOnFrame={id:string;slug:string;name:string;url:string;color:string;variantId?:string;prepared:boolean};
const LEGACY:Record<string,string>={'ovalo-negro':'ovalo','cat-eye-ambar':'ambar','cat-eye-mosaico':'mosaico'};

// Product identity comes from published product/variant IDs, never from color or visual similarity.
export function tryOnFrames(products:CatalogProduct[]):TryOnFrame[]{
 return products.flatMap(p=>{
  const variants=(p.variants??[]).filter(v=>v.front);
  if(variants.length)return variants.map(v=>({id:`${p.id}:${v.id}`,slug:p.slug,name:p.name,color:v.name,variantId:v.id,url:v.front!.url,prepared:false}));
  const asset=LEGACY[p.slug];
  const url=asset?`/products/tryon-${asset}.webp`:p.images[0]?.url;
  return url?[{id:p.id,slug:p.slug,name:p.name,color:p.color??'',url,prepared:!!asset}]:[];
 });
}

export function initialTryOnFrame(frames:TryOnFrame[],slug?:string,color?:string){
 return frames.find(f=>f.slug===slug&&f.variantId===color)??frames.find(f=>f.slug===slug)??frames[0];
}
