import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page py-20 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-2 text-5xl">No encontramos esa página</h1>
      <p className="mx-auto mt-4 max-w-[48ch] text-muted">
        El marco ya no está disponible o el enlace es incorrecto.
      </p>
      <Link href="/marcos" className="btn mt-8">Ver marcos</Link>
    </main>
  );
}
