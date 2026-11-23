export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** false mientras no se hayan cargado las variables en Vercel. */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_KEY);
