"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/server";

export async function crearInstitucion(formData: FormData) {
  const supabase = await clienteServidor();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const amie = String(formData.get("amie") ?? "").trim();
  if (!nombre) return;
  const { error } = await supabase.rpc("crear_institucion", { p_nombre: nombre, p_amie: amie });
  if (error) throw new Error(error.message);
  revalidatePath("/panel");
}
