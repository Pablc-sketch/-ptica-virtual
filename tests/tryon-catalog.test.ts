import {describe,expect,it} from "vitest";
import {buildTryOnFrames,initialTryOnFrame} from "../src/lib/tryon-catalog";
import type {CatalogProduct} from "../src/lib/catalog-types";
const product=(slug:string,variants:CatalogProduct["variants"]=[]):CatalogProduct=>({id:slug,slug,name:slug,sku:null,brand:null,description:null,priceClp:28000,pairBasePriceClp:28000,frameShape:null,material:null,color:"Negro",gender:null,lensWidthMm:null,bridgeMm:null,templeMm:null,images:[{url:"/products/"+slug+".webp",alt:slug}],modelUrl:null,use:"optical",variants});
describe("catalogue try-on",()=>{
 it("preserves model and each selected color outside the original three",()=>{
  const frames=buildTryOnFrames([product("cat-eye-ambar"),product("optico-oslo",[{id:"black",name:"Negro",hex:"#111",hex2:null,front:{url:"/products/oslo-black.webp",alt:"Negro"},back:null},{id:"pink",name:"Rosa",hex:"#fbb",hex2:null,front:{url:"/products/oslo-pink.webp",alt:"Rosa"},back:null}])]);
  expect(frames).toHaveLength(3);expect(initialTryOnFrame(frames,"optico-oslo","pink")?.url).toBe("/products/oslo-pink.webp");expect(new Set(frames.map(f=>f.key)).size).toBe(3);
 });
 it("uses the actual front of a new model",()=>{const frames=buildTryOnFrames([product("sol-palazzo")]);expect(frames[0].url).toBe("/products/sol-palazzo.webp");expect(initialTryOnFrame(frames,"sol-palazzo")?.slug).toBe("sol-palazzo");});
});
