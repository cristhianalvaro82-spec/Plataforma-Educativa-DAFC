import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

/** Renueva la sesión en cada visita y protege las rutas privadas. */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  if (!supabaseConfigurado) return respuesta;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && request.nextUrl.pathname.startsWith("/panel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    return NextResponse.redirect(url);
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg)$).*)"],
};
