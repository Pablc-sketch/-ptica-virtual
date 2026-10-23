import { addAddress } from "@/app/mi-cuenta/actions";
import { REGIONES } from "@/lib/addresses";

// Formulario de dirección de despacho (acción de servidor). `returnTo` = página a la que vuelve al guardar.
export function AddressForm({ returnTo = "/mi-cuenta" }: { returnTo?: "/mi-cuenta" | "/cotizar" }) {
  return (
    <form action={addAddress} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="return_to" value={returnTo} />
      <label className="sm:col-span-2">Quién recibe<input name="recipient" required minLength={2} maxLength={120} autoComplete="name" className="field mt-1" /></label>
      <label>Teléfono<input name="phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" placeholder="+56 9 1234 5678" className="field mt-1" /></label>
      <label>Región<select name="region" required defaultValue="Metropolitana" autoComplete="address-level1" className="field mt-1">{REGIONES.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label>Comuna<input name="comuna" required minLength={2} maxLength={60} autoComplete="address-level2" className="field mt-1" /></label>
      <label>Calle<input name="street" required minLength={2} maxLength={120} autoComplete="address-line1" className="field mt-1" /></label>
      <label>Número<input name="street_number" required maxLength={20} inputMode="numeric" className="field mt-1" /></label>
      <label>Depto. / casa (opcional)<input name="unit" maxLength={40} autoComplete="address-line2" className="field mt-1" /></label>
      <label className="sm:col-span-2">Indicaciones para el despacho (opcional)<input name="notes" maxLength={300} className="field mt-1" /></label>
      <button className="btn sm:col-span-2 sm:justify-self-start">Guardar dirección</button>
    </form>
  );
}
