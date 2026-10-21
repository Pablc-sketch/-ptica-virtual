import { afterEach, describe, expect, it, vi } from "vitest";
import { comparisonIds } from "../src/lib/compare-store";
import { parseComparisonQuery } from "../src/lib/compare-query";
afterEach(()=>vi.unstubAllGlobals());
describe("comparison list boundaries",()=>{
  it("caps the list at three and preserves choice order",()=>expect(comparisonIds(["a","b","c","d"])).toEqual(["a","b","c"]));
  it("deduplicates choices without consuming slots",()=>expect(comparisonIds(["a","a","b","c"])).toEqual(["a","b","c"]));
  it("discards corrupt or mixed local data",()=>{for(const value of [null,"a",["a",{id:"b"}],[""],["a".repeat(81)]]) expect(comparisonIds(value)).toEqual([]);});
  it("accepts an empty comparison",()=>expect(comparisonIds([])).toEqual([]));
});
describe("comparison choices",()=>{
  it("limits real choices to three and permits replacement after removal",async()=>{
    const values=new Map<string,string>();
    vi.stubGlobal("localStorage",{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
    vi.resetModules();
    const store=await import("../src/lib/compare-store");
    expect(store.toggleComparison("a")).toBe("ok");
    store.toggleComparison("b");store.toggleComparison("c");
    expect(store.toggleComparison("d")).toBe("limit");
    expect(JSON.parse(values.get("optica:comparar")!)).toEqual(["a","b","c"]);
    store.toggleComparison("b");expect(store.toggleComparison("d")).toBe("ok");
    expect(JSON.parse(values.get("optica:comparar")!)).toEqual(["a","c","d"]);
  });
  it("continues in memory when the browser blocks storage",async()=>{
    vi.stubGlobal("localStorage",{getItem:()=>{throw new Error("blocked");},setItem:()=>{throw new Error("blocked");}});
    vi.resetModules();const store=await import("../src/lib/compare-store");
    expect(store.toggleComparison("a")).toBe("ok");expect(store.toggleComparison("b")).toBe("ok");expect(store.toggleComparison("c")).toBe("ok");expect(store.toggleComparison("d")).toBe("limit");store.clearComparison();expect(store.toggleComparison("d")).toBe("ok");
  });
});
describe("public comparison request boundary",()=>{
  const ids=[1,2,3,4].map(i=>`${i.toString().repeat(8)}-1111-4111-8111-111111111111`);
  it("accepts three unique UUIDs",()=>expect(parseComparisonQuery(ids.slice(0,3).join(","))).toEqual(ids.slice(0,3)));
  it("rejects malformed, empty, and oversized queries",()=>{for(const raw of [null,"", "id=anything",ids.join(","),`${ids[0]},`,"x".repeat(121)])expect(parseComparisonQuery(raw)).toBeNull();});
  it("deduplicates a valid chosen model",()=>expect(parseComparisonQuery(`${ids[0]},${ids[0]}`)).toEqual([ids[0]]));
});
