import { addAddress } from "@/app/mi-cuenta/actions";
import { REGIONES } from "@/lib/addresses";
import {PhoneInput,ContactInput} from '@/components/contact-input';

// Formulario de dirección de despacho (acción de servidor). `returnTo` = página a la que vuelve al guardar.
export function AddressForm({ returnTo = "/mi-cuenta" }: { returnTo?: "/mi-cuenta" | "/cotizar" }) {
  return (
    <form action={addAddress} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="return_to" value={returnTo} />
      <label className="sm:col-span-2">Quién recibe<ContactInput format="name" name="recipient" required minLength={2} maxLength={120} autoComplete="name" placeholder="Nombre y apellido" className="field mt-1" /></label>
      <label>Celular<PhoneInput name="phone" required className="field mt-1"/></label>
      <label>Región<select name="region" required defaultValue="Metropolitana" autoComplete="address-level1" className="field mt-1">{REGIONES.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label>Comuna<ContactInput format="name" name="comuna" required minLength={2} maxLength={60} autoComplete="address-level2" placeholder="Ej.: Quilicura" className="field mt-1" /></label>
      <label>Calle<ContactInput name="street" required minLength={2} maxLength={120} autoComplete="address-line1" placeholder="Ej.: Av. Las Torres" className="field mt-1" /></label>
      <label>Número<ContactInput format="number" name="street_number" required maxLength={20} placeholder="Ej.: 1234 o S/N" className="field mt-1" /></label>
      <label>Depto. / casa (opcional)<input name="unit" maxLength={40} autoComplete="address-line2" className="field mt-1" /></label>
      <label className="sm:col-span-2">Indicaciones para el despacho (opcional)<input name="notes" maxLength={300} className="field mt-1" /></label>
      <button className="btn sm:col-span-2 sm:justify-self-start">Guardar dirección</button>
    </form>
  );
}
