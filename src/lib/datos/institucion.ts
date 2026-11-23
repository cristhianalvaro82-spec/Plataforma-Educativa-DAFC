import { clienteServidor } from "@/lib/supabase/server";

export type Institucion = {
  id: string;
  nombre: string;
  codigo_amie: string | null;
  sostenimiento: string | null;
  zona: string | null;
  distrito: string | null;
  circuito: string | null;
  provincia: string | null;
  canton: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  lema: string | null;
  logo_path: string | null;
  pie_pagina: string | null;
  color_primario: string | null;
};

export type Autoridad = { cargo: string; nombre: string; titulo: string | null; orden: number };

/** Institución principal del usuario (la primera donde es miembro) y sus roles. */
export async function institucionDelUsuario() {
  const supabase = await clienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: filas } = await supabase.from("miembros").select("institucion_id, rol").eq("usuario_id", user.id);
  if (!filas?.length) return { user, institucion: null, roles: [] as string[], autoridades: [] as Autoridad[] };
  const id = filas[0].institucion_id as string;
  const roles = filas.filter((f) => f.institucion_id === id).map((f) => f.rol as string);
  const { data: institucion } = await supabase.from("instituciones").select("*").eq("id", id).single();
  const { data: autoridades } = await supabase
    .from("autoridades").select("cargo, nombre, titulo, orden").eq("institucion_id", id).order("orden");
  return { user, institucion: institucion as Institucion | null, roles, autoridades: (autoridades ?? []) as Autoridad[] };
}

export function urlLogo(supabaseUrl: string, logoPath: string | null) {
  return logoPath ? `${supabaseUrl}/storage/v1/object/public/logos/${logoPath}` : null;
}
