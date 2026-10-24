"use client";

import Image from "next/image";
import { useState } from "react";
import type { CatalogImage, CatalogVariant } from "@/lib/catalog-types";

// Foto + selector de color de la compra: la foto cambia con el color elegido (el valor viaja en el formulario).
export function CheckoutColor({ variants, initial, fallback, formId }: { variants: CatalogVariant[]; initial?: string; fallback?: CatalogImage; formId: string }) {
  const [id, setId] = useState(initial ?? variants[0]?.id);
  const v = variants.find((x) => x.id === id);
  const img = v?.front ?? fallback;
  return (
    <>
      <div className="checkout-preview relative aspect-[4/3] overflow-hidden border border-line">
        {img && <Image src={img.url} alt={img.alt} fill sizes="(min-width:1024px) 40vw,100vw" className="object-contain" />}
      </div>
      {variants.length > 1 && (
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm">Color: <strong>{v?.name}</strong></legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => (
              <label key={x.id} className="color-swatch" title={x.name}>
                <input type="radio" form={formId} name="variant_id" value={x.id} checked={x.id === id} onChange={() => setId(x.id)} className="sr-only" />
                <span aria-hidden="true" style={{ background: x.hex2 ? `linear-gradient(135deg, ${x.hex} 50%, ${x.hex2} 50%)` : x.hex }} />
                <span className="sr-only">{x.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}
