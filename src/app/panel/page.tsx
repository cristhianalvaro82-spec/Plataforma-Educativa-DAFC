import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/server";
import { leerConfigSupabase } from "@/lib/supabase/config";
import ControlSesion from "./ControlSesion";
import { crearInstitucion } from "./acciones";

const NOMBRE_ROL: Record<string, string> = {
  administrador: "Administrador",
  autoridad: "Autoridad",
  vicerrectorado: "Vicerrectorado",
  inspeccion: "Inspección",
  dece: "DECE",
  tutor: "Tutor",
  docente: "Docente",
};

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const cfg = leerConfigSupabase();
  if (!cfg.configurado) redirect("/ingresar");
  const supabase = await clienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar?motivo=sesion");

  const { data: perfil } = await supabase.from("perfiles").select("nombres, apellidos").eq("id", user.id).single();
  const { data: membresias } = await supabase
    .from("miembros")
    .select("rol, instituciones(id, nombre, codigo_amie)")
    .eq("usuario_id", user.id);

  type Fila = { rol: string; instituciones: { id: string; nombre: string; codigo_amie: string | null } | null };
  const filas = (membresias ?? []) as unknown as Fila[];
  const porInstitucion = new Map<string, { nombre: string; amie: string | null; roles: string[] }>();
  for (const m of filas) {
    if (!m.instituciones) continue;
    const i = porInstitucion.get(m.instituciones.id) ?? { nombre: m.instituciones.nombre, amie: m.instituciones.codigo_amie, roles: [] };
    i.roles.push(m.rol);
    porInstitucion.set(m.instituciones.id, i);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <ControlSesion url={cfg.url} clave={cfg.key} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hola, {perfil?.nombres || user.email}
          </h1>
          <p className="text-slate-600">Bienvenido a tu plataforma docente.</p>
        </div>
        <form action="/auth/salir" method="post">
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">Cerrar sesión</button>
        </form>
      </div>

      {porInstitucion.size === 0 ? (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Registra tu unidad educativa</h2>
          <p className="mt-1 text-sm text-slate-600">
            Quien la registra queda como administrador y luego invita a los demás docentes.
          </p>
          <form action={crearInstitucion} className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <input name="nombre" required placeholder="Nombre de la unidad educativa"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="amie" placeholder="Código AMIE" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca-oscuro">Registrar</button>
          </form>
        </section>
      ) : (
        <section className="mt-8 grid gap-4">
          {[...porInstitucion.entries()].map(([id, i]) => (
            <div key={id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">{i.nombre}</h2>
              {i.amie && <p className="text-sm text-slate-600">AMIE {i.amie}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {i.roles.map((r) => (
                  <span key={r} className="rounded-full bg-marca-50 px-2.5 py-0.5 text-xs font-medium text-marca">{NOMBRE_ROL[r] ?? r}</span>
                ))}
              </div>
              <h3 className="mt-5 text-sm font-semibold text-slate-800">Pasos para empezar</h3>
              <ol className="mt-2 grid gap-2 text-sm">
                <li>
                  <Link href="/panel/institucion" className="flex items-center justify-between rounded-lg border border-marca-200 bg-marca-50 px-3 py-2 text-marca hover:bg-marca-100">
                    <span>1. Completar datos, logo y autoridades de la institución</span><span>→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/membrete" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
                    <span>2. Probar un oficio en Word con el membrete</span><span>→</span>
                  </Link>
                </li>
                <li className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-slate-400">3. Invitar a los docentes (próximamente)</li>
                <li className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-slate-400">4. Crear cursos, paralelos y nóminas (próximamente)</li>
              </ol>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
