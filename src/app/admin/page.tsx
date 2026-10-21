import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

async function Summary() {
  const { supabase } = await requireAdmin();
  const [drafts, published, quotes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const cards: [string, number | null, string][] = [
    ["Borradores", drafts.count, "/admin/productos"],
    ["Publicados", published.count, "/admin/productos"],
    ["Cotizaciones nuevas", quotes.count, "/admin/cotizaciones"],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(([t, n, href]) => (
        <Link key={t} href={href} className="border border-line bg-white/60 p-5 hover:bg-sage/40">
          <p className="eyebrow">{t}</p>
          <p className="font-serif text-5xl">{n ?? "—"}</p>
        </Link>
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <main className="container-page py-10">
      <h1 className="mb-6 text-4xl">Administración</h1>
      <AdminNav />
      <Suspense fallback={<p role="status">Cargando…</p>}>
        <Summary />
      </Suspense>
    </main>
  );
}
