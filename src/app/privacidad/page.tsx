import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidad (borrador)", description: "Cómo se tratan hoy los datos en este sitio. Texto en revisión." };

export default function PrivacidadPage() {
  return (
    <main className="container-page max-w-3xl py-10 md:py-14">
      <p className="eyebrow">Privacidad · borrador de revisión</p>
      <h1 className="mb-6 text-[clamp(36px,5vw,64px)]">Cómo tratamos tus datos</h1>
      <div role="note" className="mb-8 border border-line bg-sage/50 p-4 text-sm">
        Este texto describe lo que el sitio hace hoy. <strong>Es un borrador pendiente de revisión</strong> por la óptica: aún no
        incluye responsable legal, canal de contacto, plazos de conservación ni procedimiento para ejercer derechos.
      </div>
      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-2xl">Navegar sin cuenta</h2>
          <p className="text-muted">
            Puedes ver el catálogo sin registrarte. Tus <strong>favoritos, tu selección y la lista del comparador</strong> se guardan en tu navegador
            (almacenamiento local) y no se asocian a ti ni se guardan en nuestro servidor. Al abrir “Tu selección”, tu navegador
            consulta al servidor los datos y precios vigentes de los marcos elegidos (envía solo sus identificadores, sin tus datos
            personales). La comparación usa datos del catálogo público y guarda solo identificadores de marcos en este dispositivo. Puedes vaciarla desde el comparador. Tu selección solo se guarda en el servidor cuando envías una cotización.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-2xl">Cuenta</h2>
          <p className="text-muted">
            Si creas una cuenta guardamos tu correo en el servicio de acceso; tu contraseña queda protegida por ese servicio (no la vemos ni la guardamos en texto legible). Usamos cookies de sesión
            necesarias para mantenerte conectado. Registrarte no otorga permisos de administración.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-2xl">Cotizaciones</h2>
          <p className="text-muted">
            Cuando se habiliten, una cotización guarda tu nombre, tu correo o teléfono, tus comentarios y los marcos elegidos. El
            precio lo calcula el servidor; no se acepta ningún monto desde tu navegador. Las cotizaciones aún no están abiertas.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-2xl">Receta</h2>
          <p className="text-muted">
            Tu receta es un dato sensible. Solo la pedimos si has iniciado sesión y aceptas expresamente su revisión. Se guarda en
            un almacenamiento <strong>privado</strong>: solo tú y el equipo autorizado pueden abrirla, mediante un enlace temporal de
            60 segundos. Aceptamos JPG, PNG, WebP o PDF de hasta 4 MB, y verificamos el contenido del archivo. Cada envío registra la
            fecha y la versión del aviso que aceptaste. Puedes eliminar una receta desde “Mi cuenta”: se borra el archivo y su registro.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-2xl">Dónde se almacenan los datos</h2>
          <p className="text-muted">
            En un proyecto de Supabase dedicado a este sitio, en la región de São Paulo (Brasil), separado de cualquier otro sistema.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-2xl">Pendiente de definir</h2>
          <ul className="list-disc pl-5 text-muted">
            <li>Responsable del tratamiento y canal de contacto.</li>
            <li>Plazo de conservación de recetas y cotizaciones.</li>
            <li>Procedimiento para acceder, corregir o eliminar el resto de tus datos. Hoy solo puedes eliminar tus recetas desde “Mi cuenta”; no hay botón para borrar la cuenta ni las cotizaciones.</li>
            <li>Condiciones de venta y de pago.</li>
          </ul>
        </section>
      </div>
      <Link href="/mi-cuenta" className="btn btn-ghost mt-10">Ir a mi cuenta</Link>
    </main>
  );
}
