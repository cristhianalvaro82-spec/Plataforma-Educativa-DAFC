import Link from "next/link";
import { contextoGestion } from "@/lib/datos/gestion";
import { GRADOS } from "@/lib/datos/catalogos";
import { EDITORES, LECTORES, claveNombre } from "@/lib/datos/estudiantes";
import Mensajes, { Cabecera, archivo, entrada, botonPrincipal, botonSecundario, tarjeta } from "../Mensajes";
import BotonConfirmar from "../BotonConfirmar";
import { agregarEstudiante, asignarCurso, borrarFicha, cambiarRetiro, importarNomina, quitarDelCurso } from "./acciones";

export const dynamic = "force-dynamic";

type Curso = { id: string; grado: string; paralelo: string; jornada: string; especialidad: string | null };
type Fila = {
  numero_lista: number | null; retirado: boolean;
  estudiantes: { id: string; cedula: string | null; apellidos: string; nombres: string; celular: string | null; correo: string | null;
    familiares: { tipo: string; apellidos: string | null; nombres: string | null; celular: string | null }[] } | null;
};

const FALTA = <span className="text-slate-400" title="Sin dato">—</span>;

const ordenGrado = (g: string) => GRADOS.findIndex((x) => x.grado === g);

export default async function EstudiantesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; curso?: string; q?: string }> }) {
  const { ok, error, curso: cursoId, q } = await searchParams;
  const { supabase, inst } = await contextoGestion(LECTORES);
  const editor = inst.roles.some((r) => EDITORES.includes(r));
  const { data: anio } = await supabase.from("anios_lectivos").select("id, nombre").eq("institucion_id", inst.id).eq("activo", true).maybeSingle();
  const { data: cursos } = anio
    ? await supabase.from("cursos").select("id, grado, paralelo, jornada, especialidad").eq("anio_lectivo_id", anio.id)
    : { data: [] };
  const lista = ((cursos ?? []) as Curso[]).sort((a, b) =>
    ordenGrado(a.grado) - ordenGrado(b.grado) || a.jornada.localeCompare(b.jornada) || a.paralelo.localeCompare(b.paralelo));
  const verSinCurso = cursoId === "sin";
  const actual = lista.find((c) => c.id === cursoId) ?? lista[0];

  // Estudiantes con ficha guardada pero sin curso en el año lectivo activo.
  type Suelto = { id: string; cedula: string | null; apellidos: string; nombres: string };
  const [{ data: todos }, { data: mats }] = await Promise.all([
    supabase.from("estudiantes").select("id, cedula, apellidos, nombres").eq("institucion_id", inst.id).order("apellidos").order("nombres"),
    lista.length ? supabase.from("matriculas").select("estudiante_id, curso_id").in("curso_id", lista.map((c) => c.id)) : Promise.resolve({ data: [] }),
  ]);
  const cursoDe = new Map(((mats ?? []) as { estudiante_id: string; curso_id: string }[]).map((m) => [m.estudiante_id, m.curso_id]));
  const sinCurso = ((todos ?? []) as Suelto[]).filter((e) => !cursoDe.has(e.id));
  // Posible duplicado: mismo nombre que alguien que sí está en un curso.
  const conCurso = new Map(((todos ?? []) as Suelto[]).filter((e) => cursoDe.has(e.id)).map((e) => [claveNombre(e.apellidos, e.nombres), e]));
  const nombreCurso = (id: string | undefined) => { const c = lista.find((x) => x.id === id); return c ? `${c.grado} "${c.paralelo}"` : ""; };

  const { data: filas } = actual
    ? await supabase.from("matriculas")
        .select("numero_lista, retirado, estudiantes(id, cedula, apellidos, nombres, celular, correo, familiares(tipo, apellidos, nombres, celular))")
        .eq("curso_id", actual.id).order("numero_lista")
    : { data: [] };
  const filtro = (q ?? "").trim().toLowerCase();
  const nomina = ((filas ?? []) as unknown as Fila[]).filter((f) => f.estudiantes &&
    (!filtro || `${f.estudiantes.apellidos} ${f.estudiantes.nombres} ${f.estudiantes.cedula ?? ""}`.toLowerCase().includes(filtro)));
  const activos = nomina.filter((f) => !f.retirado).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Cabecera titulo="Estudiantes" texto="Nómina por curso y ficha de cada estudiante con madre, padre y representante legal." />
      <Mensajes ok={ok} error={error} />

      {!lista.length ? (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Primero crea el año lectivo y los cursos en <Link href="/panel/gestion/cursos" className="font-medium underline">Cursos y asignaturas</Link>.
          Mientras tanto puedes descargar la <a download href="/panel/gestion/estudiantes/plantilla" className="font-medium underline">plantilla de Excel</a> para irla llenando.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {lista.map((c) => {
              const sel = !verSinCurso && c.id === actual?.id;
              return (
                <Link key={c.id} href={`?curso=${c.id}`}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${sel ? "border-marca bg-marca text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  {c.grado} &ldquo;{c.paralelo}&rdquo;
                  {c.especialidad && <span className={`block text-xs ${sel ? "text-marca-100" : "text-slate-500"}`}>{c.especialidad}</span>}
                </Link>
              );
            })}
            {(sinCurso.length > 0 || verSinCurso) && (
              <Link href="?curso=sin"
                className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${verSinCurso ? "border-amber-600 bg-amber-600 text-white" : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"}`}>
                Sin curso ({sinCurso.length})
                <span className={`block text-xs ${verSinCurso ? "text-amber-100" : "text-amber-700"}`}>Fichas guardadas</span>
              </Link>
            )}
          </nav>

          {verSinCurso ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Sin curso · {sinCurso.length} estudiantes</h2>
              <p className="mt-1 text-sm text-slate-600">
                Son fichas guardadas de estudiantes que hoy no están en ningún curso (por ejemplo, porque no venían en la última nómina que subiste).
                Puedes pasarlos a su curso o, si la ficha sobra, borrarla.
              </p>
              {sinCurso.length === 0 ? <p className="mt-4 text-sm text-slate-500">No hay estudiantes sin curso. 👍</p> : (
                <>
                  <form id="asignar" action={asignarCurso} className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <span className="text-sm">Pasar los marcados a:</span>
                    <select name="destino" required defaultValue="" className={entrada.replace("w-full ", "") + " w-auto"}>
                      <option value="" disabled>Elige el curso</option>
                      {lista.map((c) => <option key={c.id} value={c.id}>{c.grado} &ldquo;{c.paralelo}&rdquo;{c.especialidad ? ` · ${c.especialidad}` : ""}</option>)}
                    </select>
                    <button className={botonPrincipal} disabled={!editor}>Pasar al curso</button>
                  </form>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <tr><th className="py-2 pr-2">Marcar</th><th>Cédula</th><th>Apellidos y nombres</th><th>Aviso</th><th></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sinCurso.map((e) => {
                          const dup = conCurso.get(claveNombre(e.apellidos, e.nombres));
                          return (
                            <tr key={e.id} className="hover:bg-marca-50/50">
                              <td className="py-2 pr-2"><input type="checkbox" name="ids" value={e.id} form="asignar" defaultChecked={!dup} className="h-4 w-4" /></td>
                              <td className="py-2 font-medium tabular-nums text-marca">{e.cedula ?? FALTA}</td>
                              <td className="py-2">
                                <Link href={`/panel/gestion/estudiantes/${e.id}?curso=sin`} className="font-medium text-marca hover:underline">{e.apellidos} {e.nombres}</Link>
                              </td>
                              <td className="py-2 text-xs text-amber-700">
                                {dup && <>Posible ficha repetida: ya está en {nombreCurso(cursoDe.get(dup.id))}{dup.cedula ? ` con C.I. ${dup.cedula}` : ""}.</>}
                              </td>
                              <td className="py-2 text-right">
                                {editor && (
                                  <form action={borrarFicha}>
                                    <input type="hidden" name="id" value={e.id} />
                                    <BotonConfirmar pregunta="¿Borrar esta ficha para siempre?">Borrar ficha</BotonConfirmar>
                                  </form>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : (

          <div className="grid gap-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{actual.grado} &ldquo;{actual.paralelo}&rdquo; · {activos} estudiantes</h2>
                  <p className="text-xs text-slate-500">Jornada {actual.jornada}{anio ? ` · Año lectivo ${anio.nombre}` : ""}</p>
                </div>
                <form className="flex gap-2">
                  <input type="hidden" name="curso" value={actual.id} />
                  <input name="q" defaultValue={q} placeholder="Buscar estudiante o cédula" className={entrada} />
                  <button className={botonSecundario}>Buscar</button>
                </form>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-12" /><col className="w-28" /><col /><col className="w-[30%]" /><col className="w-28" /><col className="w-16" />
                  </colgroup>
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr><th className="py-2 pr-2">N.º</th><th className="pr-3">Cédula</th><th className="pr-3">Apellidos y nombres</th><th className="pr-3">Representante</th><th className="pr-3">Celular repr.</th><th></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nomina.map((f) => {
                      const e = f.estudiantes!;
                      const r = e.familiares.find((x) => x.tipo === "representante") ?? e.familiares.find((x) => x.tipo === "madre") ?? e.familiares[0];
                      return (
                        <tr key={e.id} className={`align-middle ${f.retirado ? "opacity-50" : "hover:bg-marca-50/50"}`}>
                          <td className="py-2 pr-2 font-medium tabular-nums text-marca">{f.numero_lista}</td>
                          <td className="py-2 pr-3 font-medium tabular-nums text-marca">{e.cedula ?? FALTA}</td>
                          <td className="py-2 pr-3 leading-snug">
                            <Link href={`/panel/gestion/estudiantes/${e.id}?curso=${actual.id}`} className="font-medium text-marca hover:underline">
                              {e.apellidos} {e.nombres}
                            </Link>
                            {f.retirado && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Retirado</span>}
                          </td>
                          <td className="py-2 pr-3 leading-snug">{r ? `${r.apellidos ?? ""} ${r.nombres ?? ""}` : FALTA}</td>
                          <td className="py-2 pr-3 tabular-nums">{r?.celular ?? FALTA}</td>
                          <td className="py-2 text-right">
                            {editor && (
                              <details className="inline-block text-left">
                                <summary className="cursor-pointer list-none text-xs text-slate-500 hover:text-marca">Más ▾</summary>
                                <div className="mt-1 grid gap-1 text-xs">
                                  <form action={cambiarRetiro}>
                                    <input type="hidden" name="curso" value={actual.id} />
                                    <input type="hidden" name="id" value={e.id} />
                                    <input type="hidden" name="retirado" value={f.retirado ? "0" : "1"} />
                                    <button className="text-marca hover:underline">{f.retirado ? "Reincorporar" : "Marcar retirado"}</button>
                                  </form>
                                  <form action={quitarDelCurso}>
                                    <input type="hidden" name="curso" value={actual.id} />
                                    <input type="hidden" name="id" value={e.id} />
                                    <BotonConfirmar pregunta="¿Quitar de este curso?">Quitar del curso</BotonConfirmar>
                                  </form>
                                </div>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {nomina.length === 0 && (
                      <tr><td colSpan={6} className="py-4 text-slate-500">
                        {filtro ? "Ningún estudiante coincide." : "Este curso todavía no tiene estudiantes. Impórtalos desde Excel aquí abajo."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {editor && (
              <section className={`${tarjeta} mt-0`}>
                <h2 className="font-semibold text-slate-900">Cargar la nómina desde Excel</h2>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  <li>Descarga la <a download href="/panel/gestion/estudiantes/plantilla" className="font-medium text-marca underline">plantilla vacía</a> (o una <a download href="/panel/gestion/estudiantes/plantilla?ejemplo=1" className="font-medium text-marca underline">nómina de ejemplo ficticia</a> para practicar).</li>
                  <li>Llénala con una fila por estudiante. También sirve la <b>nómina que descarga el Ministerio</b> (No., Cédula, Nombres completos, Cuenta) o el Excel de la ficha de Sistema Orozco.</li>
                  <li>Súbela aquí. Primero la <b>nómina del Ministerio</b>; después, si quieres, el Excel de fichas de Orozco (.xls) para completar madre, padre y representante. Nadie se duplica: se reconoce por la cédula.</li>
                </ol>
                <form action={importarNomina} className="mt-4 grid gap-3">
                  <input type="hidden" name="curso" value={actual.id} />
                  <fieldset className="grid gap-2 sm:grid-cols-2">
                    <legend className="mb-1 text-sm font-semibold text-slate-800">¿Qué Excel vas a subir?</legend>
                    <label className="flex cursor-pointer gap-2 rounded-lg border-2 border-slate-200 p-3 text-sm hover:border-marca has-[:checked]:border-marca has-[:checked]:bg-blue-50">
                      <input type="radio" name="modo" value="reemplazar" defaultChecked className="mt-1" />
                      <span><b>La nómina del curso</b> (la del Ministerio)<br />
                        <span className="text-xs text-slate-600">El curso queda igual al Excel. Quienes no estén en el Excel salen del curso; su ficha se guarda.</span></span>
                    </label>
                    <label className="flex cursor-pointer gap-2 rounded-lg border-2 border-slate-200 p-3 text-sm hover:border-marca has-[:checked]:border-marca has-[:checked]:bg-blue-50">
                      <input type="radio" name="modo" value="completar" className="mt-1" />
                      <span><b>Datos para completar fichas</b> (el de Orozco)<br />
                        <span className="text-xs text-slate-600">Solo completa datos de quienes ya están en el curso. No agrega ni saca a nadie.</span></span>
                    </label>
                  </fieldset>
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="file" name="archivo" accept=".xlsx,.xls,.csv" required className={archivo} />
                    <button className={botonPrincipal}>Subir a {actual.grado} &ldquo;{actual.paralelo}&rdquo;</button>
                  </div>
                  {error?.startsWith("Ojo:") && (
                    <label className="flex items-center gap-2 text-sm text-red-700">
                      <input type="checkbox" name="seguro" value="1" /> Sí, estoy seguro: este Excel es la nómina de este curso.
                    </label>
                  )}
                </form>

                <details className="mt-5">
                  <summary className="cursor-pointer text-sm text-marca">Agregar un estudiante a mano</summary>
                  <form action={agregarEstudiante} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto]">
                    <input type="hidden" name="curso" value={actual.id} />
                    <input name="apellidos" required placeholder="Apellidos" className={entrada} />
                    <input name="nombres" required placeholder="Nombres" className={entrada} />
                    <input name="cedula" placeholder="Cédula" className={entrada} />
                    <button className={botonPrincipal}>Agregar</button>
                  </form>
                </details>
              </section>
            )}
          </div>
          )}
        </div>
      )}
    </main>
  );
}
