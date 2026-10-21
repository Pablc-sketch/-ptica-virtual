"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordImage, recordModel } from "@/app/admin/actions";

const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function hasGlbMagic(file: File) {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return String.fromCharCode(...head) === "glTF";
}

export function MediaUploader({ productId, kind }: { productId: string; kind: "image" | "model" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get("file");
    if (!(file instanceof File) || file.size === 0) return setMsg({ ok: false, text: "Selecciona un archivo." });
    if (kind === "image") {
      if (!IMG_TYPES.includes(file.type)) return setMsg({ ok: false, text: "Usa JPG, PNG o WebP." });
      if (file.size > 5 * 1024 * 1024) return setMsg({ ok: false, text: "La foto no puede superar 5 MB." });
    } else {
      if (!/\.glb$/i.test(file.name)) return setMsg({ ok: false, text: "El modelo debe ser un archivo .glb." });
      if (file.size > 15 * 1024 * 1024) return setMsg({ ok: false, text: "El modelo no puede superar 15 MB." });
      if (!(await hasGlbMagic(file))) return setMsg({ ok: false, text: "El archivo no es un GLB válido." });
    }
    setBusy(true);
    setMsg(null);
    const ext = kind === "model" ? "glb" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;
    const bucket = kind === "image" ? "product-images" : "product-models";
    const { error } = await createClient().storage.from(bucket).upload(path, file, {
      contentType: kind === "model" ? "model/gltf-binary" : file.type,
      upsert: false,
    });
    if (error) {
      setBusy(false);
      return setMsg({ ok: false, text: "No se pudo subir el archivo." });
    }
    const res =
      kind === "image"
        ? await recordImage(productId, path, String(f.get("alt") ?? ""))
        : await recordModel(productId, path, file.size);
    setBusy(false);
    if (res.error) return setMsg({ ok: false, text: res.error });
    form.reset();
    setMsg({ ok: true, text: kind === "image" ? "Foto subida. Falta verificarla." : "Modelo subido. Falta verificarlo." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 border border-line bg-white/60 p-4">
      <label className="text-sm">
        {kind === "image" ? "Nueva foto real (JPG, PNG o WebP, máx. 5 MB)" : "Modelo 3D (.glb, máx. 15 MB)"}
        <input name="file" type="file" accept={kind === "image" ? IMG_TYPES.join(",") : ".glb"} className="field mt-1 !py-2" />
      </label>
      {kind === "image" && (
        <label className="text-sm">Texto alternativo
          <input name="alt" maxLength={200} className="field mt-1" placeholder="Describe lo que se ve en la foto" />
        </label>
      )}
      <button className="btn self-start" disabled={busy}>{busy ? "Subiendo…" : "Subir"}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-olive" : "text-red-700"}`}>{msg.text}</p>}
    </form>
  );
}
