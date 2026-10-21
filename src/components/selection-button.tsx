"use client";

import { toggleFavorite, toggleSelection, useFavorites, useSelection } from "@/lib/local-store";

export function SelectionButtons({ id }: { id: string }) {
  const isFav = useFavorites().includes(id);
  const inSel = useSelection().some((x) => x.id === id);
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" className="btn" aria-pressed={inSel} onClick={() => toggleSelection(id)}>
        {inSel ? "En tu selección ✓" : "Agregar a selección"}
      </button>
      <button type="button" className="btn btn-ghost" aria-pressed={isFav} onClick={() => toggleFavorite(id)}>
        {isFav ? "En favoritos ✓" : "Guardar en favoritos"}
      </button>
    </div>
  );
}
