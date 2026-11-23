import { NextResponse } from "next/server";
import { leerConfigSupabase } from "@/lib/supabase/config";

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
  return NextResponse.json({
    url_configurada: Boolean(url),
    clave_configurada: Boolean(key),
    tipo_clave: key.startsWith("sb_publishable_") ? "publishable" : key.startsWith("eyJ") ? "anon (JWT)" : key ? "desconocido" : "ninguna",
    conexion_supabase: baseDeDatos,
  });
}
