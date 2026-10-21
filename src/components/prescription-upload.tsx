"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MAX = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const STEPS = ["Tu archivo", "Comprueba", "Autoriza y envía"];

export function PrescriptionUpload({ quotes, replacesId }: { quotes: { id: string; label: string }[]; replacesId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quote, setQuote] = useState("");
  const [consent, setConsent] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const moved = useRef(false);
  const sending = useRef(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (moved.current) heading.current?.focus(); }, [step, sent]);

  function go(next: number) {
    moved.current = true;
    setError(null);
    setStep(next);
  }

  function choose(next: File | undefined) {
    if (!next) return;
    setError(null);
    setChecked(false);
    setConsent(false);
    setFile(null);
    setPreview(null);
    if (next.size === 0 || next.size > MAX || !TYPES.includes(next.type)) {
      setError(next.size === 0 ? "El archivo está vacío. Elige otra foto o documento." : next.size > MAX
        ? "El archivo supera 4 MB. Exporta una copia más pequeña y vuelve a elegirla."
        : "Ese formato no es compatible. Usa JPG, PNG, WebP o PDF; convierte las fotos HEIC antes de enviarlas.");
      if (input.current) input.current.value = "";
      return;
    }
    setFile(next);
    if (next.type.startsWith("image/")) setPreview(URL.createObjectURL(next));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step !== 2 || sending.current) return;
    if (!file || !checked || !consent) {
      setError("Comprueba el archivo y autoriza la revisión antes de enviarlo.");
      return;
    }
    const data = new FormData();
    data.set("file", file);
    data.set("consent", "true");
    if (replacesId) data.set("replaces_id", replacesId);
    if (quote) data.set("quote_id", quote);
    sending.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recetas", { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (res.status !== 201) {
        const fallback = res.status === 401 ? "Tu sesión terminó. Ingresa de nuevo para enviar la receta."
          : res.status === 413 ? "El archivo supera el límite permitido. Vuelve al primer paso y elige otro."
          : res.status === 429 ? "Alcanzaste el límite de envíos. Inténtalo más tarde."
          : "No pudimos confirmar el envío. Revisa Mis recetas antes de reintentar para evitar un duplicado.";
        setError(typeof body.error === "string" ? body.error : fallback);
        return;
      }
      moved.current = true;
      setSent(true);
      setFile(null);
      setPreview(null);
      setConsent(false);
      setChecked(false);
      router.refresh();
    } catch {
      setError("Se interrumpió la conexión. Tu archivo sigue aquí. Revisa Mis recetas antes de volver a enviarlo: el servidor podría haberlo recibido.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (sent) return (
    <section className="border border-line bg-white/70 p-6 md:p-8" aria-labelledby="receta-recibida">
      <p className="eyebrow mb-4">Envío recibido</p>
      <h3 ref={heading} tabIndex={-1} id="receta-recibida" className="text-3xl focus:outline-none">Tu receta ya está en tu cuenta.</h3>
      <p role="status" className="mt-4 text-muted">El siguiente paso es la revisión por el equipo autorizado. Recibir el archivo no confirma la receta ni inicia un pago.</p>
      <p className="mt-4 border-l-2 border-olive pl-4 text-sm">Consulta su estado en Mis recetas. Si necesitamos un archivo más claro, podrás ver allí el motivo.</p>
      <button type="button" className="btn btn-ghost mt-6" onClick={() => { setSent(false); setQuote(""); go(0); }}>Enviar otra receta</button>
    </section>
  );

  return (
    <form onSubmit={submit} className="border border-line bg-white/70" aria-busy={busy}>
      <ol aria-label="Pasos para enviar tu receta" className="grid grid-cols-3 border-b border-line">
        {STEPS.map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined}
          className={`min-w-0 px-3 py-4 text-xs sm:px-5 ${i === step ? "bg-sage text-ink" : "text-muted"}`}>
          <span className="mb-2 block font-mono text-[11px]">0{i + 1}{i < step ? " · listo" : ""}</span>
          <span className={i === step ? "font-semibold" : ""}>{label}</span>
        </li>)}
      </ol>
      <div className="p-5 sm:p-7">
        {replacesId && <p className="mb-5 border-l-2 border-olive bg-paper p-3 text-sm">Envías un nuevo archivo para una receta que necesita corrección. El archivo anterior conserva su registro; no se sobrescribe.</p>}
        <p className="eyebrow mb-3">Paso {step + 1} de 3</p>
        <h3 ref={heading} tabIndex={-1} className="text-2xl focus:outline-none">{["Empecemos con una foto clara.", "Mira el archivo antes de enviarlo.", "Tu receta, con acceso privado."][step]}</h3>

        <div hidden={step !== 0} className="mt-5">
          <p className="text-sm leading-relaxed text-muted">Fotografía el documento completo sobre una superficie plana, con buena luz y sin reflejos. También puedes elegir un PDF.</p>
          <label htmlFor="prescription-file" className="mt-5 block border border-dashed border-olive/50 bg-paper p-5">
            <span className="block font-semibold">{file ? "Cambiar archivo" : "Elegir foto o documento"}</span>
            <span id="prescription-file-help" className="mt-1 block text-xs text-muted">JPG, PNG, WebP o PDF · máximo 4 MB · un archivo por envío</span>
            <input ref={input} id="prescription-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              aria-describedby="prescription-file-help" disabled={busy} className="mt-4 block w-full min-w-0 text-sm file:mr-3 file:border-0 file:bg-sage file:px-3 file:py-3 file:font-semibold"
              onChange={(e) => choose(e.target.files?.[0])} />
          </label>
          {file && <p role="status" className="mt-3 break-words text-sm">Seleccionado: <strong>{file.name}</strong> · {file.size < 1024 * 1024 ? `${Math.max(1, Math.ceil(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toLocaleString("es-CL", { maximumFractionDigits: 2 })} MB`}</p>}
          <p className="mt-4 text-xs leading-relaxed text-muted">El archivo se envía solo al confirmar el último paso. No escribas tus graduaciones a mano en este formulario.</p>
        </div>

        {step === 1 && file && <div className="mt-5">
          {preview ? <div className="overflow-hidden border border-line bg-paper p-2">
            {/* Blob local: no se envía al optimizador ni a otro servicio. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa local de la receta seleccionada" className="max-h-80 w-full object-contain" />
          </div> : <div className="border border-line bg-paper p-5"><span className="eyebrow">Documento PDF</span><p className="mt-2 break-words font-semibold">{file.name}</p><p className="mt-2 text-sm text-muted">Comprueba el PDF original en tu dispositivo. Aquí no se abre ni interpreta automáticamente.</p></div>}
          <ul className="my-5 space-y-2 text-sm text-muted"><li>01 · Aparecen las cuatro esquinas del documento.</li><li>02 · El nombre y las indicaciones se pueden leer.</li><li>03 · No faltan páginas ni hay reflejos sobre los datos.</li></ul>
          <label className="flex items-start gap-3 border-t border-line pt-4 text-sm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="h-5 w-5 shrink-0 accent-olive" /><span>Revisé el archivo que elegí y corresponde a mi receta.</span></label>
        </div>}

        {step === 2 && file && <div className="mt-5">
          <div className="border-y border-line py-4"><span className="eyebrow">Archivo que enviarás</span><p className="mt-2 break-words font-semibold">{file.name}</p><button type="button" onClick={() => go(0)} disabled={busy} className="mt-2 min-h-11 text-sm underline underline-offset-4">Cambiar archivo</button></div>
          {quotes.length > 0 && <label className="mt-5 block text-sm">Asociar a una cotización <span className="text-muted">(opcional)</span><select value={quote} onChange={e => setQuote(e.target.value)} disabled={busy} className="field mt-2"><option value="">Enviar sin asociar</option>{quotes.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}</select></label>}
          <p className="my-5 text-sm leading-relaxed text-muted">Solo tu cuenta y el equipo autorizado pueden abrirla. Una persona revisará el documento antes de continuar con la cotización.</p>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy} className="h-5 w-5 shrink-0 accent-olive" /><span>Autorizo al equipo de la óptica a revisar mi receta para cotizar. Leí el <Link href="/privacidad" className="underline underline-offset-2">aviso de privacidad (borrador)</Link>.</span></label>
          <p className="mt-4 text-xs text-muted">Puedes abrir o eliminar tu archivo desde Mis recetas. No hay lectura automática ni cobro en este paso.</p>
        </div>}

        {error && <p role="alert" className="mt-5 border-l-2 border-red-700 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          {step > 0 ? <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => go(step - 1)}>Volver</button> : <span className="text-xs text-muted">Envío privado</span>}
          {step < 2 ? <button type="button" className="btn" disabled={step === 0 ? !file : !checked} onClick={() => go(step + 1)}>Continuar <span aria-hidden="true">→</span></button>
            : <button type="submit" className="btn" disabled={busy || !consent}>{busy ? "Enviando archivo…" : "Enviar mi receta"}</button>}
        </div>
        {busy && <p role="status" className="mt-3 text-sm text-muted">Espera a la confirmación antes de salir de esta página.</p>}
      </div>
    </form>
  );
}
