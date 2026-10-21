import type { Metadata } from "next";
import { QuoteForm } from "@/components/quote-form";
import { quotesOpen } from "@/lib/flags";

export const metadata: Metadata = { title: "Tu selección" };

export default function CotizarPage() {
  return (
    <main className="container-page">
      <div className="page-heading"><div><p className="eyebrow">Un paso más cerca</p><h1>Tu selección.</h1></div><p className="heading-note">Aquí se reúnen tus próximos favoritos. El valor de los cristales y la entrega se confirma contigo.</p></div>
      <div className="quote-layout"><QuoteForm open={quotesOpen()} /><aside className="quote-note"><p className="eyebrow !mt-0">De persona a persona</p><h2>Primero, tus lentes.<br />Después, los detalles.</h2><p>Tu selección es el comienzo de una conversación. Revisamos tu receta y confirmamos el valor completo antes de cualquier pago.</p><ol><li><span>01</span>Elige tus marcos</li><li><span>02</span>Revisamos tu receta</li><li><span>03</span>Confirmamos tu cotización</li></ol></aside></div>
    </main>
  );
}
