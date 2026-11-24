"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/server";

/** Asegura que el usuario tenga su fila en "perfiles" (necesaria para todo lo demás). */
async function asegurarPerfil() {
  const supabase = await clienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar?motivo=sesion");
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  await supabase
    .from("perfiles")
    .upsert({ id: user.id, nombres: meta.nombres ?? "", apellidos: meta.apellidos ?? "" }, { onConflict: "id", ignoreDuplicates: true });
  return { supabase, user };
}

export async function crearInstitucion(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const amie = String(formData.get("amie") ?? "").trim();
  if (!nombre) redirect("/panel?error=" + encodeURIComponent("Escribe el nombre de la unidad educativa."));
  const { supabase } = await asegurarPerfil();
  const { error } = await supabase.rpc("crear_institucion", { p_nombre: nombre, p_amie: amie });
  if (error) {
    const texto = /duplicate|unique/i.test(error.message)
      ? "Ese código AMIE ya está registrado en la plataforma."
      : /Ya perteneces/.test(error.message)
        ? "Ya perteneces a una unidad educativa. Recarga la página para verla."
        : "No se pudo registrar: " + error.message;
    redirect("/panel?error=" + encodeURIComponent(texto));
  }
  revalidatePath("/panel");
  redirect("/panel?ok=" + encodeURIComponent("Unidad educativa registrada. Ya eres administrador."));
}

export async function guardarNombre(formData: FormData) {
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  if (!nombres || !apellidos) redirect("/panel?error=" + encodeURIComponent("Escribe tus nombres y apellidos."));
  const { supabase, user } = await asegurarPerfil();
  const { error } = await supabase.from("perfiles").update({ nombres, apellidos }).eq("id", user.id);
  if (error) redirect("/panel?error=" + encodeURIComponent("No se pudo guardar tu nombre: " + error.message));
  await supabase.auth.updateUser({ data: { nombres, apellidos } });
  revalidatePath("/panel");
  redirect("/panel");
}
