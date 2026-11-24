"use server";

import { revalidatePath } from "next/cache";
import { contextoGestion, explicar, volver, ROLES } from "@/lib/datos/gestion";

const RUTA = "/panel/gestion/docentes";
const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const rolesDe = (f: FormData) => f.getAll("roles").map(String).filter((r) => ROLES.includes(r));

export async function invitarDocente(f: FormData) {
  const { supabase, user, inst } = await contextoGestion();
  const correo = texto(f, "correo").toLowerCase();
  const roles = rolesDe(f);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) volver(RUTA, "error", "Escribe un correo válido.");
  if (!roles.length) volver(RUTA, "error", "Elige al menos un rol.");
  const { error } = await supabase.from("invitaciones").insert({
    institucion_id: inst.id, correo, nombres: texto(f, "nombres"), apellidos: texto(f, "apellidos"),
    roles, creado_por: user.id,
  });
  if (error) volver(RUTA, "error", /duplicate|unique/i.test(error.message) ? "Ese correo ya fue invitado." : explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", `Invitación lista para ${correo}. Cuando cree su cuenta con ese correo, entrará directamente.`);
}

export async function anularInvitacion(f: FormData) {
  const { supabase } = await contextoGestion();
  const { error } = await supabase.from("invitaciones").delete().eq("id", texto(f, "id"));
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", "Invitación anulada.");
}

export async function guardarDocente(f: FormData) {
  const { supabase, inst } = await contextoGestion();
  const nombres = texto(f, "nombres");
  const apellidos = texto(f, "apellidos");
  if (!nombres || !apellidos) volver(RUTA, "error", "Escribe nombres y apellidos.");
  const { error } = await supabase.rpc("administrar_docente", {
    p_inst: inst.id, p_usuario: texto(f, "usuario"), p_nombres: nombres, p_apellidos: apellidos,
    p_roles: rolesDe(f), p_activo: f.get("activo") === "on",
  });
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", `Datos de ${nombres} ${apellidos} guardados.`);
}

export async function quitarDocente(f: FormData) {
  const { supabase, inst } = await contextoGestion();
  const { error } = await supabase.rpc("quitar_docente", { p_inst: inst.id, p_usuario: texto(f, "usuario") });
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", "Docente quitado de la institución. Su cuenta sigue existiendo y puedes invitarlo otra vez.");
}
