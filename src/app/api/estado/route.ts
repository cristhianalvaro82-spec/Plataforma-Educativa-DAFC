import { NextResponse } from "next/server";
import { leerConfigSupabase } from "@/lib/supabase/config";
import { clienteServidor } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/** Diagnóstico: indica si las variables existen, sin mostrar sus valores. */
export async function GET() {
  const { url, key } = leerConfigSupabase();
  let baseDeDatos: "ok" | "sin configurar" | "error" = "sin configurar";
  if (url && key) {
    try {
      const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" });
      baseDeDatos = r.ok ? "ok" : "error";
    } catch {
      baseDeDatos = "error";
    }
  }
  let sesion = "sin sesión";
  const nCookies = (await cookies()).getAll().filter((c) => c.name.startsWith("sb-")).length;
  if (url && key) {
    try {
      const { data, error } = await (await clienteServidor()).auth.getUser();
      sesion = data.user ? "activa: " + data.user.email : error ? "error: " + error.message : "sin sesión";
    } catch (e) {
      sesion = "error: " + (e instanceof Error ? e.message : "desconocido");
    }
  }
  return NextResponse.json({
    sesion,
    cookies_de_sesion: nCookies,
    url_configurada: Boolean(url),
    clave_configurada: Boolean(key),
    tipo_clave: key.startsWith("sb_publishable_") ? "publishable" : key.startsWith("eyJ") ? "anon (JWT)" : key ? "desconocido" : "ninguna",
    conexion_supabase: baseDeDatos,
  });
}
