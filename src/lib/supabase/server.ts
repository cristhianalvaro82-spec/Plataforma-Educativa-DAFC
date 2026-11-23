import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { leerConfigSupabase } from "./config";

export async function clienteServidor() {
  const { url, key } = leerConfigSupabase();
  const almacen = await cookies();
  return createServerClient(url, key, {
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
