import { contextoGestion } from "@/lib/datos/gestion";
import { FIGURAS, GRADOS, JORNADAS, NOMBRE_SUBNIVEL } from "@/lib/datos/catalogos";
import Mensajes, { Cabecera, entrada, botonPrincipal, botonSecundario, tarjeta } from "../Mensajes";
import BotonConfirmar from "../BotonConfirmar";
import {
  activarAnio, borrarAsignatura, guardarFechasAnio, importarAsignaturas, borrarCurso, cargarAsignaturasBase, crearAnio, crearAsignatura, crearCursos, guardarCurso,
} from "./acciones";

export const dynamic = "force-dynamic";

type Anio = { id: string; nombre: string; activo: boolean; fecha_inicio: string | null; fecha_fin: string | null };
type Curso = { id: string; grado: string; paralelo: string; jornada: string; subnivel: string; especialidad: string | null; tutor_id: string | null };
type Asignatura = { id: string; nombre: string; area: string | null };
type Docente = { usuario_id: string; nombres: string; apellidos: string; activo: boolean };

const ordenGrado = (g: string) => GRADOS.findIndex((x) => x.grado === g);

export default async function CursosPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const { supabase, inst } = await contextoGestion(["administrador", "vicerrectorado"]);
  const { data: anios } = await supabase.from("anios_lectivos").select("id, nombre, activo, fecha_inicio, fecha_fin").eq("institucion_id", inst.id).order("nombre", { ascending: false });
  const anio = ((anios ?? []) as Anio[]).find((a) => a.activo) ?? null;
  const [{ data: cursos }, { data: asignaturas }, { data: docentes }] = await Promise.all([
    anio
      ? supabase.from("cursos").select("id, grado, paralelo, jornada, subnivel, especialidad, tutor_id").eq("anio_lectivo_id", anio.id)
      : Promise.resolve({ data: [] }),
    supabase.from("asignaturas").select("id, nombre, area").eq("institucion_id", inst.id).order("orden").order("nombre"),
    supabase.rpc("listar_docentes", { p_inst: inst.id }),
  ]);
  const listaCursos = ((cursos ?? []) as Curso[]).sort((a, b) =>
    ordenGrado(a.grado) - ordenGrado(b.grado) || a.jornada.localeCompare(b.jornada) || a.paralelo.localeCompare(b.paralelo));
  const activos = ((docentes ?? []) as Docente[]).filter((d) => d.activo);
  const nombreDocente = (id: string | null) => {
    const d = activos.find((x) => x.usuario_id === id);
    return d ? `${d.apellidos} ${d.nombres}` : null;
  };
  const otrosAnios = ((anios ?? []) as Anio[]).filter((a) => !a.activo);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Cabecera titulo="Cursos y asignaturas" texto="Año lectivo, cursos con sus paralelos y tutores, y las asignaturas de la institución." />
      <Mensajes ok={ok} error={error} />

      <section className={tarjeta}>
        <h2 className="font-semibold text-slate-900">Año lectivo</h2>
        {anio ? (
          <>
            <p className="mt-1 text-sm text-slate-600">Trabajando en el año lectivo <b className="text-marca">{anio.nombre}</b>.</p>
            <form action={guardarFechasAnio} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="id" value={anio.id} />
              <label className="grid text-xs text-slate-500">Inicio (opcional)<input name="inicio" type="date" defaultValue={anio.fecha_inicio ?? ""} className={entrada} /></label>
              <label className="grid text-xs text-slate-500">Fin (opcional, complétalo cuando se conozca)<input name="fin" type="date" defaultValue={anio.fecha_fin ?? ""} className={entrada} /></label>
              <button className={`${botonSecundario} self-end py-2`}>Guardar fechas</button>
            </form>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Crea el año lectivo que está en curso. Las fechas son opcionales; puedes completarlas después.</p>
        )}
        <details className="mt-3" open={!anio}>
          <summary className="cursor-pointer text-sm text-marca">{anio ? "Crear un nuevo año lectivo" : "Crear año lectivo"}</summary>
          <form action={crearAnio} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <input name="nombre" required defaultValue={anio ? "" : "2026-2027"} placeholder="2026-2027" className={entrada} />
            <label className="grid text-xs text-slate-500">Inicio (opcional)<input name="inicio" type="date" className={entrada} /></label>
            <label className="grid text-xs text-slate-500">Fin (opcional)<input name="fin" type="date" className={entrada} /></label>
            <button className={`${botonPrincipal} self-end`}>Crear</button>
          </form>
        </details>
        {otrosAnios.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            Otros años:
            {otrosAnios.map((a) => (
              <form key={a.id} action={activarAnio}>
                <input type="hidden" name="id" value={a.id} />
                <button className={botonSecundario}>Activar {a.nombre}</button>
              </form>
            ))}
          </div>
        )}
      </section>

      {anio && (
        <section className={tarjeta}>
          <h2 className="font-semibold text-slate-900">Cursos ({listaCursos.length})</h2>
          <form action={crearCursos} className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto]">
            <input type="hidden" name="anio" value={anio.id} />
            <select name="grado" required className={entrada} defaultValue="">
              <option value="" disabled>Grado o curso</option>
              {GRADOS.map((g) => <option key={g.grado} value={g.grado}>{g.grado}</option>)}
            </select>
            <input name="paralelos" required placeholder="Paralelos: A, B, C" className={entrada} />
            <select name="jornada" className={entrada} defaultValue="matutina">
              {JORNADAS.map((j) => <option key={j} value={j}>Jornada {j}</option>)}
            </select>
            <select name="especialidad" defaultValue="" className={entrada}>
              <option value="">Figura profesional (ninguna)</option>
              {FIGURAS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <button className={botonPrincipal}>Agregar</button>
          </form>

          <ul className="mt-4 grid gap-2">
            {listaCursos.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-200">
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
                    <span>
                      <span className="font-medium text-slate-900">{c.grado} &ldquo;{c.paralelo}&rdquo;</span>
                      <span className="block text-xs text-slate-500">
                        {NOMBRE_SUBNIVEL[c.subnivel] ?? c.subnivel} · Jornada {c.jornada}{c.especialidad ? ` · ${c.especialidad}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <span className="text-slate-600">Tutor: {nombreDocente(c.tutor_id) ?? <span className="text-slate-400">sin asignar</span>}</span>
                      <span className="text-marca">Editar ▾</span>
                    </span>
                  </summary>
                  <div className="border-t border-slate-100 px-4 py-4">
                    <form action={guardarCurso} className="grid gap-3 sm:grid-cols-[120px_1fr_1.4fr_auto]">
                      <input type="hidden" name="id" value={c.id} />
                      <label className="grid text-xs text-slate-500">Paralelo<input name="paralelo" defaultValue={c.paralelo} className={entrada} /></label>
                      <label className="grid text-xs text-slate-500">Figura profesional
                        <select name="especialidad" defaultValue={c.especialidad ?? ""} className={entrada}>
                          <option value="">Ninguna</option>
                          {FIGURAS.map((x) => <option key={x} value={x}>{x}</option>)}
                          {c.especialidad && !FIGURAS.includes(c.especialidad) && <option value={c.especialidad}>{c.especialidad}</option>}
                        </select>
                      </label>
                      <label className="grid text-xs text-slate-500">Tutor
                        <select name="tutor" defaultValue={c.tutor_id ?? ""} className={entrada}>
                          <option value="">Sin tutor</option>
                          {activos.map((d) => <option key={d.usuario_id} value={d.usuario_id}>{d.apellidos} {d.nombres}</option>)}
                        </select>
                      </label>
                      <button className={`${botonPrincipal} self-end`}>Guardar</button>
                    </form>
                    <form action={borrarCurso} className="mt-3 border-t border-slate-100 pt-3">
                      <input type="hidden" name="id" value={c.id} />
                      <BotonConfirmar pregunta="¿Borrar este curso y su distribución?">Borrar curso</BotonConfirmar>
                    </form>
                  </div>
                </details>
              </li>
            ))}
            {listaCursos.length === 0 && (
              <li className="text-sm text-slate-500">Todavía no hay cursos. Agrega el primero arriba; puedes crear varios paralelos a la vez.</li>
            )}
          </ul>
        </section>
      )}

      <section className={tarjeta}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Asignaturas ({(asignaturas ?? []).length})</h2>
          <form action={cargarAsignaturasBase}>
            <button className={botonSecundario}>Cargar lista base de Bachillerato</button>
          </form>
        </div>
        <form action={crearAsignatura} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="nombre" required placeholder="Nombre, por ejemplo Matemática" className={entrada} />
          <input name="area" placeholder="Área (opcional)" className={entrada} />
          <button className={botonPrincipal}>Agregar</button>
        </form>
        <details className="mt-4 rounded-lg border border-dashed border-marca-200 bg-marca-50/40 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-marca">Importar muchas asignaturas desde Excel</summary>
          <p className="mt-2 text-sm text-slate-600">
            En la <b>primera columna</b> va el nombre de la asignatura o módulo; en la <b>segunda</b> (opcional), el área o la figura profesional. Se lee solo la primera hoja del Excel.
            Las que ya existen no se repiten.
          </p>
          <form action={importarAsignaturas} className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm text-slate-700">Subir archivo Excel (.xlsx) o CSV
              <input type="file" name="archivo" accept=".xlsx,.csv" className="text-sm" />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">…o copia las celdas en Excel y pégalas aquí
              <textarea name="pegado" rows={4} placeholder={"Mecánica Básica\tElectromecánica Automotriz\nContabilidad General\tGestión Administrativa y Logística"} className={entrada} />
            </label>
            <div><button className={botonPrincipal}>Importar</button></div>
          </form>
        </details>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {((asignaturas ?? []) as Asignatura[]).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span><b className="text-slate-900">{a.nombre}</b>{a.area && <span className="block text-xs text-slate-500">{a.area}</span>}</span>
              <form action={borrarAsignatura}>
                <input type="hidden" name="id" value={a.id} />
                <BotonConfirmar pregunta="¿Borrar?">Borrar</BotonConfirmar>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
