"use server";

import { revalidatePath } from "next/cache";
import { contextoGestion, explicar, volver } from "@/lib/datos/gestion";

const RUTA = "/panel/gestion/distribucion";

/** Guarda de una vez qué docente da cada asignatura en un curso. */
export async function guardarDistribucion(f: FormData) {
  const { supabase, inst } = await contextoGestion(["administrador", "vicerrectorado"]);
  const curso = String(f.get("curso") ?? "");
  const ruta = `${RUTA}?curso=${curso}`;
  const asignar: { institucion_id: string; curso_id: string; asignatura_id: string; docente_id: string; periodos_semana: number }[] = [];
  const quitar: string[] = [];
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("doc_")) continue;
    const asignatura = k.slice(4);
    const docente = String(v);
    const periodos = Math.max(0, Math.min(40, parseInt(String(f.get(`per_${asignatura}`) ?? "1"), 10) || 0));
    if (docente) asignar.push({ institucion_id: inst.id, curso_id: curso, asignatura_id: asignatura, docente_id: docente, periodos_semana: periodos || 1 });
    else quitar.push(asignatura);
  }
  if (quitar.length) {
    const { error } = await supabase.from("clases").delete().eq("curso_id", curso).in("asignatura_id", quitar);
    if (error) volver(ruta, "error", explicar(error.message));
  }
  if (asignar.length) {
    const { error } = await supabase.from("clases").upsert(asignar, { onConflict: "curso_id,asignatura_id" });
    if (error) volver(ruta, "error", explicar(error.message));
  }
  revalidatePath(RUTA);
  volver(ruta, "ok", "Distribución guardada.");
}
