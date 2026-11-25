"use server";

import { revalidatePath } from "next/cache";
import { contextoGestion, explicar, volver } from "@/lib/datos/gestion";
import { EDITORES } from "@/lib/datos/estudiantes";
import { leerFilas } from "@/lib/excel";
import {
  CAMPOS_ESTUDIANTE, TIPOS, camposDe, interpretarNomina, normalizarCedula, normalizarFecha, normalizarSexo, type Tipo,
} from "@/lib/datos/estudiantes";

const RUTA = "/panel/gestion/estudiantes";
const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const mayus = (s: string) => s.replace(/\s+/g, " ").trim().toLocaleUpperCase("es-EC");
const numero = (s: string | undefined) => {
  const n = parseFloat((s ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : null;
};

/** Convierte los textos de la ficha en una fila para la tabla "estudiantes". */
function filaEstudiante(e: Record<string, string>) {
  return {
    cedula: e.cedula ? normalizarCedula(e.cedula) : null,
    apellidos: mayus(e.apellidos ?? ""),
    nombres: mayus(e.nombres ?? ""),
    sexo: e.sexo ? normalizarSexo(e.sexo) : null,
    fecha_nacimiento: e.fecha_nacimiento ? normalizarFecha(e.fecha_nacimiento) : null,
    nacionalidad: e.nacionalidad || null,
    provincia_nacimiento: e.provincia_nacimiento || null,
    etnia: e.etnia || null,
    discapacidad: e.discapacidad || null,
    nee: e.discapacidad ? !/^(no|ninguna|n\/a|-)$/i.test(e.discapacidad) : null,
    lateralidad: e.lateralidad || null,
    peso_kg: numero(e.peso_kg),
    talla_cm: numero(e.talla_cm),
    direccion: e.direccion || null,
    celular: e.celular || null,
    correo: e.correo || null,
    actualizado_en: new Date().toISOString(),
  };
}

function filaFamiliar(tipo: Tipo, d: Record<string, string>) {
  const fila: Record<string, string | null> = { tipo };
  for (const [k] of camposDe(tipo)) fila[k] = (d[k] ?? "").trim() || null;
  if (fila.cedula) fila.cedula = normalizarCedula(fila.cedula);
  if (fila.apellidos) fila.apellidos = mayus(fila.apellidos);
  if (fila.nombres) fila.nombres = mayus(fila.nombres);
  return fila;
}

/**
 * Importa un Excel en un curso. Dos modos:
 * - "reemplazar": el Excel es la nómina oficial del curso. Crea o actualiza a cada
 *   estudiante y saca del curso a quienes no están en el Excel (su ficha se conserva).
 * - "completar": solo completa datos (ficha, madre, padre, representante) de los
 *   estudiantes que YA están en el curso; no agrega ni saca a nadie.
 */
export async function importarNomina(f: FormData) {
  const { supabase, inst } = await contextoGestion(EDITORES);
  const curso = texto(f, "curso");
  const modo = texto(f, "modo") === "completar" ? "completar" : "reemplazar";
  const seguro = texto(f, "seguro") === "1";
  const ruta = `${RUTA}?curso=${curso}`;
  if (!curso) volver(RUTA, "error", "Elige el curso.");
  let filas: string[][] = [];
  try {
    filas = await leerFilas(f.get("archivo") as File | null, "");
  } catch (e) {
    volver(ruta, "error", e instanceof Error ? e.message : "No se pudo leer el archivo.");
  }
  if (!filas.length) volver(ruta, "error", "Elige el archivo Excel.");
  const { registros } = interpretarNomina(filas);
  if (!registros.length) volver(ruta, "error", "No encontré estudiantes. Revisa que haya columnas Apellidos y Nombres (o Apellidos y nombres).");

  const { data: cursoDato } = await supabase.from("cursos").select("grado, paralelo").eq("id", curso).maybeSingle();
  const nombreCurso = cursoDato ? `${cursoDato.grado} "${cursoDato.paralelo}"` : "este curso";
  const { data: existentes, error: e0 } = await supabase.from("estudiantes").select("id, cedula, apellidos, nombres").eq("institucion_id", inst.id);
  if (e0) volver(ruta, "error", explicar(e0.message));
  const porCedula = new Map((existentes ?? []).filter((x) => x.cedula).map((x) => [x.cedula as string, x.id as string]));
  const porNombre = new Map((existentes ?? []).map((x) => [`${x.apellidos}|${x.nombres}`, x.id as string]));
  const buscar = (fila: ReturnType<typeof filaEstudiante>) =>
    (fila.cedula && porCedula.get(fila.cedula)) || porNombre.get(`${fila.apellidos}|${fila.nombres}`);

  // Quiénes están hoy en el curso.
  const { data: yaMatriculados } = await supabase.from("matriculas")
    .select("estudiante_id, estudiantes(apellidos, nombres)").eq("curso_id", curso);
  type M = { estudiante_id: string; estudiantes: { apellidos: string; nombres: string } | null };
  const enCurso = new Map<string, string>();
  for (const m of (yaMatriculados ?? []) as unknown as M[]) enCurso.set(m.estudiante_id, `${m.estudiantes?.apellidos} ${m.estudiantes?.nombres}`);

  // ¿El Excel parece de otro curso? (ninguno de sus estudiantes está en este curso)
  const coinciden = registros.filter((r) => { const id = buscar(filaEstudiante(r.estudiante)); return id && enCurso.has(id); }).length;
  if (modo === "completar" && coinciden === 0)
    volver(ruta, "error", `Ningún estudiante de ese Excel está en ${nombreCurso}, así que no hay datos que completar. Revisa que hayas elegido el curso correcto.`);
  if (modo === "reemplazar" && enCurso.size > 0 && coinciden === 0 && !seguro)
    volver(ruta, "error", `Ojo: ninguno de los ${registros.length} estudiantes de ese Excel está hoy en ${nombreCurso}. Si lo subes, los ${enCurso.size} actuales saldrían del curso. Si de verdad es la nómina de este curso, marca "Sí, estoy seguro" y súbelo otra vez.`);

  let nuevos = 0, actualizados = 0, omitidos = 0;
  // Un error en un estudiante no detiene a los demás: se anota y se sigue.
  const fallidos: string[] = [];
  const ids: { id: string; apellidos: string; nombres: string }[] = [];
  for (const r of registros) {
    const fila = filaEstudiante(r.estudiante);
    // Solo se envían los campos que vinieron en el Excel, para no borrar datos ya guardados.
    const datos = Object.fromEntries(Object.entries(fila).filter(([k, v]) =>
      v !== null || ["apellidos", "nombres"].includes(k))) as Record<string, unknown>;
    const id = buscar(fila);
    if (modo === "completar" && !(id && enCurso.has(id))) { omitidos++; continue; }
    let estudianteId = id;
    const quien = `${fila.apellidos} ${fila.nombres}`;
    if (id) {
      const { error } = await supabase.from("estudiantes").update(datos).eq("id", id);
      if (error) { fallidos.push(`${quien} (${explicar(error.message)})`); continue; }
      actualizados++;
    } else {
      const { data, error } = await supabase.from("estudiantes").insert({ ...datos, institucion_id: inst.id }).select("id").single();
      if (error || !data) { fallidos.push(`${quien} (${explicar(error?.message ?? "sin respuesta")})`); continue; }
      estudianteId = data.id;
      if (fila.cedula) porCedula.set(fila.cedula, estudianteId!);
      porNombre.set(`${fila.apellidos}|${fila.nombres}`, estudianteId!);
      nuevos++;
    }
    ids.push({ id: estudianteId!, apellidos: fila.apellidos, nombres: fila.nombres });

    const familiares = TIPOS.filter((t) => r.familiares[t] && Object.values(r.familiares[t]!).some(Boolean))
      .map((t) => ({ ...filaFamiliar(t, r.familiares[t]!), estudiante_id: estudianteId }));
    if (familiares.length) {
      const { error } = await supabase.from("familiares").upsert(familiares, { onConflict: "estudiante_id,tipo" });
      if (error) fallidos.push(`${quien}: datos de familiares (${explicar(error.message)})`);
    }
  }

  const partes: string[] = [];
  if (modo === "reemplazar") {
    // Salen del curso los que no están en el Excel (su ficha se conserva).
    const quedan = new Set(ids.map((x) => x.id));
    const salen = [...enCurso.keys()].filter((x) => !quedan.has(x));
    // Si algún estudiante del Excel falló, no se saca a nadie, para no perder a quien sí debía estar.
    if (salen.length && !fallidos.length) {
      const { error } = await supabase.from("matriculas").delete().eq("curso_id", curso).in("estudiante_id", salen);
      if (error) volver(ruta, "error", explicar(error.message));
      partes.push(`Salieron del curso ${salen.length} que no estaban en el Excel (sus fichas siguen guardadas): ${salen.map((x) => enCurso.get(x)).join(", ")}.`);
    }
    // Número de lista en orden alfabético.
    const orden = ids.map((x): [string, string] => [x.id, `${x.apellidos} ${x.nombres}`])
      .concat(fallidos.length ? [...enCurso.entries()].filter(([x]) => !quedan.has(x)) : [])
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .filter(([x], i, todos) => todos.findIndex(([y]) => y === x) === i); // sin repetidos
    const { error: eM } = await supabase.from("matriculas").upsert(
      orden.map(([estudiante_id], i) => ({ estudiante_id, curso_id: curso, numero_lista: i + 1 })),
      { onConflict: "estudiante_id,curso_id" });
    if (eM) volver(ruta, "error", explicar(eM.message));
  } else if (omitidos) {
    partes.push(`${omitidos} del Excel no están en ${nombreCurso} y no se tocaron.`);
  }

  revalidatePath(RUTA);
  const resumen = modo === "reemplazar"
    ? `Nómina de ${nombreCurso} actualizada: ${nuevos} nuevos y ${actualizados} que ya estaban.`
    : `Datos completados de ${actualizados} estudiantes de ${nombreCurso}.`;
  const texto_ = [resumen, ...partes].join(" ");
  if (fallidos.length) volver(ruta, "error", `${texto_} Revisa ${fallidos.length === 1 ? "este caso" : `estos ${fallidos.length} casos`}: ${fallidos.join("; ")}.`);
  volver(ruta, "ok", texto_);
}

/** Agrega un estudiante a mano y abre su ficha. */
export async function agregarEstudiante(f: FormData) {
  const { supabase, inst } = await contextoGestion(EDITORES);
  const curso = texto(f, "curso");
  const ruta = `${RUTA}?curso=${curso}`;
  const fila = filaEstudiante({ apellidos: texto(f, "apellidos"), nombres: texto(f, "nombres"), cedula: texto(f, "cedula") });
  if (!fila.apellidos || !fila.nombres) volver(ruta, "error", "Escribe apellidos y nombres.");
  const { data, error } = await supabase.from("estudiantes")
    .insert({ institucion_id: inst.id, apellidos: fila.apellidos, nombres: fila.nombres, cedula: fila.cedula }).select("id").single();
  if (error) volver(ruta, "error", /duplicate|unique/i.test(error.message) ? "Ya existe un estudiante con esa cédula." : explicar(error.message));
  const { count } = await supabase.from("matriculas").select("*", { count: "exact", head: true }).eq("curso_id", curso);
  await supabase.from("matriculas").insert({ estudiante_id: data!.id, curso_id: curso, numero_lista: (count ?? 0) + 1 });
  revalidatePath(RUTA);
  volver(`${RUTA}/${data!.id}?curso=${curso}`, "ok", "Estudiante agregado. Completa su ficha.");
}

/** Guarda la ficha completa (estudiante + madre + padre + representante). */
export async function guardarFicha(f: FormData) {
  const { supabase } = await contextoGestion(EDITORES);
  const id = texto(f, "id");
  const curso = texto(f, "curso");
  const ruta = `${RUTA}/${id}${curso ? `?curso=${curso}` : ""}`;
  const e: Record<string, string> = {};
  for (const [k] of CAMPOS_ESTUDIANTE) e[k] = texto(f, k);
  const fila = { ...filaEstudiante(e), nee: false as boolean | null };
  fila.nee = filaEstudiante(e).nee ?? false;
  if (!fila.apellidos || !fila.nombres) volver(ruta, "error", "Apellidos y nombres son obligatorios.");
  const { error } = await supabase.from("estudiantes").update(fila).eq("id", id);
  if (error) volver(ruta, "error", /duplicate|unique/i.test(error.message) ? "Otra ficha ya usa esa cédula." : explicar(error.message));
  for (const tipo of TIPOS) {
    const d: Record<string, string> = {};
    for (const [k] of camposDe(tipo)) d[k] = texto(f, `${tipo}_${k}`);
    if (Object.values(d).some(Boolean)) {
      const { error: e2 } = await supabase.from("familiares").upsert({ ...filaFamiliar(tipo, d), estudiante_id: id }, { onConflict: "estudiante_id,tipo" });
      if (e2) volver(ruta, "error", explicar(e2.message));
    } else {
      await supabase.from("familiares").delete().eq("estudiante_id", id).eq("tipo", tipo);
    }
  }
  revalidatePath(RUTA);
  volver(ruta, "ok", "Ficha guardada.");
}

/** Marca o desmarca a un estudiante como retirado del curso (no borra su ficha). */
export async function cambiarRetiro(f: FormData) {
  const { supabase } = await contextoGestion(EDITORES);
  const curso = texto(f, "curso");
  const { error } = await supabase.from("matriculas").update({ retirado: texto(f, "retirado") === "1" })
    .eq("curso_id", curso).eq("estudiante_id", texto(f, "id"));
  if (error) volver(`${RUTA}?curso=${curso}`, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(`${RUTA}?curso=${curso}`, "ok", texto(f, "retirado") === "1" ? "Estudiante marcado como retirado." : "Estudiante reincorporado.");
}

/** Quita al estudiante de este curso (por ejemplo, si se cargó en el paralelo equivocado). */
export async function quitarDelCurso(f: FormData) {
  const { supabase } = await contextoGestion(EDITORES);
  const curso = texto(f, "curso");
  const { error } = await supabase.from("matriculas").delete().eq("curso_id", curso).eq("estudiante_id", texto(f, "id"));
  if (error) volver(`${RUTA}?curso=${curso}`, "error", explicar(error.message));
  revalidatePath(RUTA);
  volver(`${RUTA}?curso=${curso}`, "ok", "Estudiante quitado del curso. Su ficha sigue guardada.");
}
