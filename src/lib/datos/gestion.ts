import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/server";

export const NOMBRE_ROL: Record<string, string> = {
  administrador: "Administrador",
  autoridad: "Autoridad",
  vicerrectorado: "Vicerrectorado",
  inspeccion: "Inspección",
  dece: "DECE",
  tutor: "Tutor",
  docente: "Docente",
};
export const ROLES = Object.keys(NOMBRE_ROL);

/**
 * Contexto de las pantallas de Gestión: sesión, institución y roles.
 * Si el usuario no tiene alguno de los roles pedidos, vuelve al panel.
 */
export async function contextoGestion(rolesPermitidos: string[] = ["administrador"]) {
  const supabase = await clienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar?motivo=sesion");
  const { data, error } = await supabase.rpc("mis_instituciones");
  if (error) redirect("/panel");
  const inst = (data ?? [])[0] as { id: string; nombre: string; codigo_amie: string | null; roles: string[] } | undefined;
  if (!inst) redirect("/panel");
  if (!inst.roles.some((r) => rolesPermitidos.includes(r))) {
    redirect("/panel?error=" + encodeURIComponent("Esa sección es solo para el administrador."));
  }
  return { supabase, user, inst, esAdmin: inst.roles.includes("administrador") };
}

/** Redirige con un mensaje verde o rojo arriba de la página. */
export function volver(ruta: string, tipo: "ok" | "error", texto: string): never {
  redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}${tipo}=${encodeURIComponent(texto)}`);
}

/** Traduce los errores más comunes de la base a lenguaje sencillo. */
export function explicar(mensaje: string) {
  if (/duplicate|unique/i.test(mensaje)) return "Ese registro ya existe.";
  if (/foreign key/i.test(mensaje)) return "No se puede borrar porque tiene información asociada.";
  if (/permission|row-level/i.test(mensaje)) return "No tienes permiso para hacer ese cambio.";
  return mensaje;
}
