import Link from "next/link";
import { contextoGestion } from "@/lib/datos/gestion";
import { GRADOS, asignaturasDelCurso } from "@/lib/datos/catalogos";
import Mensajes, { Cabecera, entrada, botonPrincipal, tarjeta } from "../Mensajes";
import { guardarDistribucion } from "./acciones";

export const dynamic = "force-dynamic";

type Curso = { id: string; grado: string; paralelo: string; jornada: string; especialidad: string | null };
type Asignatura = { id: string; nombre: string; area: string | null };
type Docente = { usuario_id: string; nombres: string; apellidos: string; activo: boolean };
type Clase = { curso_id: string; asignatura_id: string; docente_id: string; periodos_semana: number };

const ordenGrado = (g: string) => GRADOS.findIndex((x) => x.grado === g);

export default async function DistribucionPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; curso?: string; todas?: string }> }) {
  const { ok, error, curso: cursoId, todas: verTodas } = await searchParams;
  const { supabase, inst } = await contextoGestion(["administrador", "vicerrectorado"]);
  const { data: anio } = await supabase.from("anios_lectivos").select("id, nombre").eq("institucion_id", inst.id).eq("activo", true).maybeSingle();
  const [{ data: cursos }, { data: asignaturas }, { data: docentes }, { data: clases }] = await Promise.all([
    anio ? supabase.from("cursos").select("id, grado, paralelo, jornada, especialidad").eq("anio_lectivo_id", anio.id) : Promise.resolve({ data: [] }),
    supabase.from("asignaturas").select("id, nombre, area").eq("institucion_id", inst.id).order("orden").order("nombre"),
    supabase.rpc("listar_docentes", { p_inst: inst.id }),
    supabase.from("clases").select("curso_id, asignatura_id, docente_id, periodos_semana").eq("institucion_id", inst.id).eq("archivada", false),
  ]);
  const listaCursos = ((cursos ?? []) as Curso[]).sort((a, b) =>
    ordenGrado(a.grado) - ordenGrado(b.grado) || a.jornada.localeCompare(b.jornada) || a.paralelo.localeCompare(b.paralelo));
  const idsCursos = new Set(listaCursos.map((c) => c.id));
  const todas = ((clases ?? []) as Clase[]).filter((c) => idsCursos.has(c.curso_id));
  const lista = (docentes ?? []) as Docente[];
  const activos = lista.filter((d) => d.activo);
  const actual = listaCursos.find((c) => c.id === cursoId) ?? listaCursos[0];
  const delCurso = new Map(todas.filter((c) => c.curso_id === actual?.id).map((c) => [c.asignatura_id, c]));
  const asigs = (asignaturas ?? []) as Asignatura[];
  // Tronco común + solo los módulos de la figura del curso (y los que ya tengan docente).
  const delCursoLista = (c: Curso) => asignaturasDelCurso(asigs, c.especialidad, c.grado);
  const propias = actual ? delCursoLista(actual) : [];
  const idsPropias = new Set(propias.map((a) => a.id));
  const visibles = verTodas
    ? asigs.map((a) => ({ ...a, sugeridas: propias.find((p) => p.id === a.id)?.sugeridas ?? null }))
    : [...propias, ...asigs.filter((a) => !idsPropias.has(a.id) && delCurso.has(a.id)).map((a) => ({ ...a, sugeridas: null }))];
  const ocultas = asigs.length - visibles.length;

  // Carga horaria por docente en el año activo.
  const carga = new Map<string, number>();
  for (const c of todas) carga.set(c.docente_id, (carga.get(c.docente_id) ?? 0) + c.periodos_semana);
  const resumen = lista.filter((d) => carga.has(d.usuario_id))
    .map((d) => ({ nombre: `${d.apellidos} ${d.nombres}`, periodos: carga.get(d.usuario_id)! }))
    .sort((a, b) => b.periodos - a.periodos);

  const faltan = !anio ? "Primero crea el año lectivo en Cursos y asignaturas."
    : !listaCursos.length ? "Primero registra los cursos en Cursos y asignaturas."
    : !asigs.length ? "Primero registra las asignaturas en Cursos y asignaturas."
    : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Cabecera titulo="Distribución de trabajo" texto={`Qué docente dicta cada asignatura en cada curso${anio ? `, año lectivo ${anio.nombre}` : ""}.`} />
      <Mensajes ok={ok} error={error} />

      {faltan ? (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {faltan} <Link href="/panel/gestion/cursos" className="font-medium underline">Ir ahora</Link>
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {listaCursos.map((c) => {
              const asignadas = todas.filter((x) => x.curso_id === c.id).length;
              const total = delCursoLista(c).length;
              const sel = c.id === actual?.id;
              return (
                <Link key={c.id} href={`?curso=${c.id}`}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${sel ? "border-marca bg-marca text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  {c.grado} &ldquo;{c.paralelo}&rdquo;
                  <span className={`block text-xs ${sel ? "text-marca-100" : "text-slate-500"}`}>{c.especialidad ? `${c.especialidad} · ` : ""}{asignadas}/{total} asignadas</span>
                </Link>
              );
            })}
          </nav>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{actual.grado} &ldquo;{actual.paralelo}&rdquo; · jornada {actual.jornada}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {actual.especialidad
                ? <>Se muestran el tronco común y solo los módulos de <b>{actual.especialidad}</b> de este año, con las horas del plan de estudios ya puestas.</>
                : <>Se muestra el tronco común. Para ver los módulos técnicos, pon la figura profesional del curso en Cursos y asignaturas.</>}
              {" "}Deja &ldquo;Sin asignar&rdquo; lo que este curso no tenga.
            </p>
            {(ocultas > 0 || verTodas) && (
              <Link href={`?curso=${actual.id}${verTodas ? "" : "&todas=1"}`} className="mt-1 inline-block text-xs text-marca hover:underline">
                {verTodas ? "Ver solo las de este curso" : `Ver todas las asignaturas (${ocultas} ocultas)`}
              </Link>
            )}
            <form action={guardarDistribucion} className="mt-4">
              <input type="hidden" name="curso" value={actual.id} />
              <div className="grid gap-2">
                {visibles.map((a) => {
                  const c = delCurso.get(a.id);
                  return (
                    <div key={a.id} className="grid items-center gap-2 border-b border-slate-100 pb-2 sm:grid-cols-[1fr_1.4fr_110px]">
                      <span className="text-sm font-medium text-slate-800">{a.nombre}
                        {a.sugeridas ? <span className="block text-xs font-normal text-slate-500">Plan de estudios: {a.sugeridas} h/sem</span> : null}
                      </span>
                      <select name={`doc_${a.id}`} defaultValue={c?.docente_id ?? ""} className={entrada}>
                        <option value="">Sin asignar</option>
                        {activos.map((d) => <option key={d.usuario_id} value={d.usuario_id}>{d.apellidos} {d.nombres}</option>)}
                      </select>
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        <input name={`per_${a.id}`} type="number" min={1} max={40} defaultValue={c?.periodos_semana ?? a.sugeridas ?? 1} className={`${entrada.replace("w-full ", "")} w-16`} />
                        h/sem
                      </label>
                    </div>
                  );
                })}
              </div>
              <button className={`${botonPrincipal} mt-4`}>Guardar distribución del curso</button>
            </form>
          </section>
        </div>
      )}

      {resumen.length > 0 && (
        <section className={tarjeta}>
          <h2 className="font-semibold text-slate-900">Carga horaria por docente</h2>
          <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
            {resumen.map((r) => (
              <li key={r.nombre} className="flex justify-between border-b border-slate-100 py-1">
                <span className="text-slate-700">{r.nombre}</span><span className="font-medium text-slate-900">{r.periodos} h/sem</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
