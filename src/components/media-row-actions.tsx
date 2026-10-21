"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteImage, setImageVerified, setModelVerified, type ActionResult } from "@/app/admin/actions";

export function MediaRowActions({
  kind,
  productId,
  imageId,
  verified,
}: {
  kind: "image" | "model";
  productId: string;
  imageId?: string;
  verified: boolean;
}) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<ActionResult>) {
    setBusy(true);
    setErr("");
    const r = await fn();
    setBusy(false);
    if (r.error) setErr(r.error);
    else router.refresh();
  }
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className="btn btn-ghost !min-h-11 !px-3"
          onClick={() => run(() => (kind === "image" ? setImageVerified(imageId!, productId, !verified) : setModelVerified(productId, !verified)))}>
          {verified ? "Quitar verificación" : "Marcar como verificada"}
        </button>
        {kind === "image" && (
          <button type="button" disabled={busy} className="btn btn-ghost !min-h-11 !px-3"
            onClick={() => { if (confirm("¿Eliminar esta foto?")) run(() => deleteImage(imageId!, productId)); }}>
            Eliminar
          </button>
        )}
      </div>
      {err && <p role="alert" className="text-red-700">{err}</p>}
    </div>
  );
}
