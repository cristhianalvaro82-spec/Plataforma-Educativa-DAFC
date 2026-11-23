import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export async function clienteServidor() {
  const almacen = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el middleware las renueva.
        }
      },
    },
  });
}
