import { contextoGestion, NOMBRE_ROL, ROLES } from "@/lib/datos/gestion";
import Mensajes, { Cabecera, entrada, botonPrincipal, botonSecundario, tarjeta } from "../Mensajes";
import BotonConfirmar from "../BotonConfirmar";
import { anularInvitacion, guardarDocente, invitarDocente, quitarDocente } from "./acciones";

export const dynamic = "force-dynamic";

type Docente = { usuario_id: string; nombres: string; apellidos: string; correo: string | null; roles: string[]; activo: boolean };
type Invitacion = { id: string; correo: string; nombres: string; apellidos: string; roles: string[]; creado_en: string };

function CasillasRoles({ marcados }: { marcados: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {ROLES.map((r) => (
        <label key={r} className="flex items-center gap-1.5 text-sm text-slate-700">
          <input type="checkbox" name="roles" value={r} defaultChecked={marcados.includes(r)} className="h-4 w-4 accent-marca" />
          {NOMBRE_ROL[r]}
        </label>
      ))}
    </div>
  );
}

export default async function DocentesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  const { ok, error, q } = await searchParams;
  const { supabase, user, inst } = await contextoGestion();
  const [{ data: docentes }, { data: invitaciones }] = await Promise.all([
    supabase.rpc("listar_docentes", { p_inst: inst.id }),
    supabase.from("invitaciones").select("id, correo, nombres, apellidos, roles, creado_en")
      .eq("institucion_id", inst.id).is("aceptada_en", null).order("creado_en", { ascending: false }),
  ]);
  const filtro = (q ?? "").trim().toLowerCase();
  const lista = ((docentes ?? []) as Docente[]).filter((d) =>
    !filtro || `${d.nombres} ${d.apellidos} ${d.correo ?? ""}`.toLowerCase().includes(filtro));
  const pendientes = (invitaciones ?? []) as Invitacion[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Cabecera titulo="Docentes" texto={`Personal de ${inst.nombre}. Solo el administrador ve esta pantalla.`} />
      <Mensajes ok={ok} error={error} />

      <section className={tarjeta}>
        <h2 className="font-semibold text-slate-900">Invitar a un docente</h2>
        <p className="mt-1 text-sm text-slate-600">
          Escribe su correo. Luego el docente entra a la plataforma, toca <b>Crear cuenta</b> con ese mismo correo y queda dentro de la institución con los roles que elijas.
        </p>
        <form action={invitarDocente} className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="nombres" placeholder="Nombres" className={entrada} />
            <input name="apellidos" placeholder="Apellidos" className={entrada} />
            <input name="correo" type="email" required placeholder="correo@docentes.educacion.edu.ec" className={entrada} />
          </div>
          <CasillasRoles marcados={["docente"]} />
          <div><button className={botonPrincipal}>Invitar</button></div>
        </form>

        {pendientes.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-semibold text-slate-800">Invitaciones pendientes ({pendientes.length})</h3>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {pendientes.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <b>{[i.nombres, i.apellidos].filter(Boolean).join(" ") || "Sin nombre"}</b>{" "}
                    <span className="text-slate-500">{i.correo}</span>{" "}
                    <span className="text-xs text-slate-500">· {i.roles.map((r) => NOMBRE_ROL[r] ?? r).join(", ")}</span>
                  </span>
                  <form action={anularInvitacion}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className={botonSecundario}>Anular</button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={tarjeta}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Docentes registrados ({(docentes ?? []).length})</h2>
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Buscar por nombre o correo" className={entrada} />
            <button className={botonSecundario}>Buscar</button>
          </form>
        </div>
        <ul className="mt-4 grid gap-2">
          {lista.map((d) => (
            <li key={d.usuario_id} className="rounded-lg border border-slate-200">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
                  <span>
                    <span className="font-medium text-slate-900">{d.apellidos} {d.nombres}</span>
                    {d.usuario_id === user.id && <span className="ml-2 text-xs text-slate-500">(tú)</span>}
                    <span className="block text-xs text-slate-500">{d.correo}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {!d.activo && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">Desactivado</span>}
                    {d.roles.map((r) => (
                      <span key={r} className="rounded-full bg-marca-50 px-2 py-0.5 text-xs font-medium text-marca">{NOMBRE_ROL[r] ?? r}</span>
                    ))}
                    <span className="ml-1 text-sm text-marca">Editar ▾</span>
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-4 py-4">
                  <form action={guardarDocente} className="grid gap-3">
                    <input type="hidden" name="usuario" value={d.usuario_id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input name="nombres" defaultValue={d.nombres} required placeholder="Nombres" className={entrada} />
                      <input name="apellidos" defaultValue={d.apellidos} required placeholder="Apellidos" className={entrada} />
                    </div>
                    <CasillasRoles marcados={d.roles} />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="activo" defaultChecked={d.activo} className="h-4 w-4 accent-marca" />
                      Activo (si lo desmarcas, no podrá entrar a los datos de la institución)
                    </label>
                    <div><button className={botonPrincipal}>Guardar cambios</button></div>
                  </form>
                  {d.usuario_id !== user.id && (
                    <form action={quitarDocente} className="mt-3 border-t border-slate-100 pt-3">
                      <input type="hidden" name="usuario" value={d.usuario_id} />
                      <BotonConfirmar pregunta={`¿Quitar a ${d.nombres} ${d.apellidos} de la institución?`}>
                        Quitar de la institución
                      </BotonConfirmar>
                    </form>
                  )}
                </div>
              </details>
            </li>
          ))}
          {lista.length === 0 && <li className="text-sm text-slate-500">No hay docentes que coincidan.</li>}
        </ul>
      </section>
    </main>
  );
}
