import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { classifyAuthError, type AuthClass } from "@/lib/session";

// Refresca la sesión de Supabase y exige usuario para /admin (el rol admin se
// verifica además en cada página con requireAdmin()).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  // Una cookie corrupta o caducada se trata como visitante anónimo; un fallo del servicio de acceso o un error
  // desconocido NO se disfraza de "sin sesión": no se redirige, y la página (requireAdmin) decide y falla visiblemente.
  let hasClaims = false;
  let kind: AuthClass = "anonymous";
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (data?.claims) hasClaims = true;
    else if (error) kind = classifyAuthError(error);
  } catch (thrown) {
    kind = classifyAuthError(thrown);
    if (kind === "unknown") console.error("proxy: error de sesión no clasificado", thrown);
  }
  const { pathname } = request.nextUrl;
  if (!hasClaims && kind === "anonymous" && pathname.startsWith("/admin") && pathname !== "/admin/login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|glb)$).*)"],
};
