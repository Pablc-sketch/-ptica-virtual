"use client";

import { toggleFavorite, toggleSelection, useFavorites, useSelection } from "@/lib/local-store";

export function SelectionButtons({ id, name }: { id: string; name: string }) {
  const isFav = useFavorites().includes(id);
  const inSel = useSelection().some((x) => x.id === id);
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" className={`btn ${inSel ? "" : ""}`} aria-pressed={inSel} onClick={() => toggleSelection(id)}>
        {inSel ? "En tu selección ✓" : "Agregar a selección"}
      </button>
      <button type="button" className="btn btn-ghost" aria-pressed={isFav} aria-label={isFav ? `Quitar ${name} de favoritos` : `Guardar ${name} en favoritos`} onClick={() => toggleFavorite(id)}>
        {isFav ? "En favoritos ✓" : "Guardar en favoritos"}
      </button>
    </div>
  );
}
