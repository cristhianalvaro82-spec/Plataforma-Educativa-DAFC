"use server";

import { revalidatePath } from "next/cache";
import { contextoGestion, explicar, volver } from "@/lib/datos/gestion";
import { leerFilas } from "@/lib/excel";
import { ASIGNATURAS_BASE, GRADOS, JORNADAS } from "@/lib/datos/catalogos";

const RUTA = "/panel/gestion/cursos";
const GESTORES = ["administrador", "vicerrectorado"];
const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function crearAnio(f: FormData) {
  const { supabase, inst } = await contextoGestion(GESTORES);
  const nombre = texto(f, "nombre");
  if (!nombre) volver(RUTA, "error", "Escribe el nombre del año lectivo, por ejemplo 2026-2027.");
  const { data: mismo } = await supabase.from("anios_lectivos").select("id").eq("institucion_id", inst.id).ilike("nombre", nombre).maybeSingle();
  if (mismo) volver(RUTA, "error", `El año lectivo ${nombre} ya existe. Si no está activo, usa su botón "Activar".`);
  await supabase.from("anios_lectivos").update({ activo: false }).eq("institucion_id", inst.id);
  const { error } = await supabase.from("anios_lectivos").insert({
    institucion_id: inst.id, nombre, activo: true,
    fecha_inicio: texto(f, "inicio") || null, fecha_fin: texto(f, "fin") || null,
  });
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", `Año lectivo ${nombre} creado y activo.`);
}

export async function activarAnio(f: FormData) {
  const { supabase, inst } = await contextoGestion(GESTORES);
  await supabase.from("anios_lectivos").update({ activo: false }).eq("institucion_id", inst.id);
  const { error } = await supabase.from("anios_lectivos").update({ activo: true }).eq("id", texto(f, "id"));
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", "Año lectivo activado.");
}

export async function crearCursos(f: FormData) {
  const { supabase, inst } = await contextoGestion(GESTORES);
  const anio = texto(f, "anio");
  const g = GRADOS.find((x) => x.grado === texto(f, "grado"));
  const jornada = JORNADAS.includes(texto(f, "jornada")) ? texto(f, "jornada") : "matutina";
  const paralelos = texto(f, "paralelos").toUpperCase().split(/[\s,;]+/).filter(Boolean);
  if (!anio) volver(RUTA, "error", "Primero crea el año lectivo.");
  if (!g) volver(RUTA, "error", "Elige el grado o curso.");
  if (!paralelos.length) volver(RUTA, "error", "Escribe al menos un paralelo, por ejemplo A o A, B, C.");
  const filas = paralelos.map((p) => ({
    institucion_id: inst.id, anio_lectivo_id: anio, subnivel: g!.subnivel, grado: g!.grado,
    paralelo: p, jornada, especialidad: texto(f, "especialidad") || null,
  }));
  const { error } = await supabase.from("cursos").upsert(filas, {
    onConflict: "anio_lectivo_id,grado,paralelo,jornada", ignoreDuplicates: true,
  });
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", `${g!.grado} paralelo${paralelos.length > 1 ? "s" : ""} ${paralelos.join(", ")} listo${paralelos.length > 1 ? "s" : ""}.`);
}

export async function guardarCurso(f: FormData) {
  const { supabase } = await contextoGestion(GESTORES);
  const g = GRADOS.find((x) => x.grado === texto(f, "grado"));
  const paralelo = texto(f, "paralelo").toUpperCase();
  if (!paralelo) volver(RUTA, "error", "Escribe el paralelo del curso.");
  const { error } = await supabase.from("cursos").update({
    ...(g ? { grado: g.grado, subnivel: g.subnivel } : {}),
    jornada: JORNADAS.includes(texto(f, "jornada")) ? texto(f, "jornada") : undefined,
    paralelo,
    especialidad: texto(f, "especialidad") || null,
    tutor_id: texto(f, "tutor") || null,
  }).eq("id", texto(f, "id"));
  if (error) volver(RUTA, "error", /duplicate|unique/i.test(error.message)
    ? "Ya existe otro curso con ese grado, paralelo y jornada." : explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", "Curso actualizado.");
}

export async function borrarCurso(f: FormData) {
  const { supabase } = await contextoGestion(GESTORES);
  const { count } = await supabase.from("matriculas").select("*", { count: "exact", head: true }).eq("curso_id", texto(f, "id"));
  if (count) volver(RUTA, "error", "Ese curso ya tiene estudiantes matriculados; no se puede borrar.");
  const { error } = await supabase.from("cursos").delete().eq("id", texto(f, "id"));
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", "Curso borrado.");
}

export async function crearAsignatura(f: FormData) {
  const { supabase, inst } = await contextoGestion(GESTORES);
  const nombre = texto(f, "nombre");
  if (!nombre) volver(RUTA, "error", "Escribe el nombre de la asignatura.");
  const { error } = await supabase.from("asignaturas").insert({ institucion_id: inst.id, nombre, area: texto(f, "area") || null });
  if (error) volver(RUTA, "error", /duplicate|unique/i.test(error.message) ? "Esa asignatura ya existe." : explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", `Asignatura ${nombre} agregada.`);
}

export async function cargarAsignaturasBase() {
  const { supabase, inst } = await contextoGestion(GESTORES);
  const { data: existentes } = await supabase.from("asignaturas").select("nombre").eq("institucion_id", inst.id);
  const ya = new Set((existentes ?? []).map((a) => a.nombre.toLowerCase()));
  const nuevas = ASIGNATURAS_BASE.filter((a) => !ya.has(a.nombre.toLowerCase()))
    .map((a, i) => ({ institucion_id: inst.id, nombre: a.nombre, area: a.area, orden: i }));
  if (nuevas.length) {
    const { error } = await supabase.from("asignaturas").insert(nuevas);
    if (error) volver(RUTA, "error", explicar(error.message));
  }
  revalidatePath(RUTA);
  volver(RUTA, "ok", nuevas.length ? `${nuevas.length} asignaturas agregadas. Borra las que tu institución no tenga.` : "Ya tenías todas las asignaturas de la lista base.");
}

export async function borrarAsignatura(f: FormData) {
  const { supabase } = await contextoGestion(GESTORES);
  const { count } = await supabase.from("clases").select("*", { count: "exact", head: true }).eq("asignatura_id", texto(f, "id"));
  if (count) volver(RUTA, "error", "Esa asignatura está asignada a docentes en Distribución. Quítala de allí primero.");
  const { error } = await supabase.from("asignaturas").delete().eq("id", texto(f, "id"));
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", "Asignatura borrada.");
}

/**
 * Importa asignaturas desde Excel o texto pegado.
 * Columna 1: nombre de la asignatura. Columna 2 (opcional): área o figura profesional.
 */
export async function importarAsignaturas(f: FormData) {
  const { supabase, inst } = await contextoGestion(GESTORES);
  let filas: string[][];
  try {
    filas = await leerFilas(f.get("archivo") as File | null, String(f.get("pegado") ?? ""));
  } catch (e) {
    volver(RUTA, "error", e instanceof Error ? e.message : "No se pudo leer el archivo.");
  }
  const encabezado = /asignatura|nombre|materia|m[óo]dulo/i;
  if (filas.length && encabezado.test(filas[0][0] ?? "")) filas = filas.slice(1);
  const { data: existentes } = await supabase.from("asignaturas").select("nombre").eq("institucion_id", inst.id);
  const ya = new Set((existentes ?? []).map((a) => a.nombre.toLowerCase()));
  const nuevas: { institucion_id: string; nombre: string; area: string | null; orden: number }[] = [];
  for (const [nombre = "", area = ""] of filas) {
    const n = nombre.replace(/\s+/g, " ").trim();
    if (!n || n.length > 150 || ya.has(n.toLowerCase())) continue;
    ya.add(n.toLowerCase());
    nuevas.push({ institucion_id: inst.id, nombre: n, area: area.trim() || null, orden: 100 + nuevas.length });
  }
  if (!nuevas.length) volver(RUTA, "error", "No encontré asignaturas nuevas. Revisa que el nombre esté en la primera columna.");
  const { error } = await supabase.from("asignaturas").insert(nuevas);
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", `${nuevas.length} asignaturas importadas.`);
}

export async function guardarFechasAnio(f: FormData) {
  const { supabase } = await contextoGestion(GESTORES);
  const { error } = await supabase.from("anios_lectivos").update({
    fecha_inicio: texto(f, "inicio") || null, fecha_fin: texto(f, "fin") || null,
  }).eq("id", texto(f, "id"));
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", "Fechas del año lectivo guardadas.");
}

/** Borra un año lectivo que no está activo y no tiene cursos (por ejemplo, uno creado dos veces). */
export async function borrarAnio(f: FormData) {
  const { supabase } = await contextoGestion(GESTORES);
  const id = texto(f, "id");
  const { count } = await supabase.from("cursos").select("*", { count: "exact", head: true }).eq("anio_lectivo_id", id);
  if (count) volver(RUTA, "error", "Ese año lectivo tiene cursos; no se puede borrar.");
  const { error } = await supabase.from("anios_lectivos").delete().eq("id", id).eq("activo", false);
  if (error) volver(RUTA, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(RUTA, "ok", "Año lectivo repetido borrado.");
}
