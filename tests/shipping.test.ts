import {describe,expect,it} from "vitest";
import {checkoutTotals} from "../src/lib/shipping";
describe("shipping",()=>{
 it.each([[28000,3500,31500],[59000,3500,62500],[59999,3500,63499],[60000,0,60000],[60001,0,60001]])("quotes %i before shipping",(subtotal,shipping,total)=>{expect(checkoutTotals(subtotal)).toEqual({subtotal,shipping,total});});
 it.each([0,-1,NaN,Infinity,1.5])("rejects invalid subtotal %s",subtotal=>{expect(()=>checkoutTotals(subtotal)).toThrow("invalid_subtotal");});
});
