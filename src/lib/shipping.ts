export const FREE_SHIPPING_FROM_CLP = 60_000;
export const SHIPPING_FEE_CLP = 3_500;
export function checkoutTotals(subtotal: number) {
  if (!Number.isSafeInteger(subtotal) || subtotal <= 0) throw new Error("invalid_subtotal");
  const shipping = subtotal >= FREE_SHIPPING_FROM_CLP ? 0 : SHIPPING_FEE_CLP;
  return { subtotal, shipping, total: subtotal + shipping };
}
