import type { Metadata } from "next";
import { QuoteForm } from "@/components/quote-form";
import { quotesOpen } from "@/lib/flags";

export const metadata: Metadata = { title: "Tu selección" };

export default function CotizarPage() {
  return (
    <main className="container-page py-10 md:py-14">
      <p className="eyebrow">Cotización</p>
      <h1 className="mb-8 text-[clamp(40px,6vw,72px)]">Tu selección</h1>
      <QuoteForm open={quotesOpen()} />
    </main>
  );
}
