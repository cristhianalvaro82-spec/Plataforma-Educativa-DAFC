/**
 * Lee la configuración de Supabase EN TIEMPO DE EJECUCIÓN (no al compilar),
 * así basta con cambiar las variables en Vercel sin depender del build.
 * Acepta varios nombres de variable y limpia espacios o saltos de línea
 * que a veces se cuelan al copiar y pegar.
 * Solo se usa en el servidor; al navegador se le pasa como prop.
 */
function primera(...nombres: string[]): string {
  const env = process.env as Record<string, string | undefined>;
  for (const n of nombres) {
    const v = env[n]?.trim().replace(/^["']|["']$/g, "");
    if (v) return v;
  }
  return "";
}

export function leerConfigSupabase() {
  const url = primera("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL").replace(/\/+$/, "");
  const key = primera(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  );
  return { url, key, configurado: Boolean(url && key) };
}
