import Link from "next/link";
import { notFound } from "next/navigation";
import { contextoGestion } from "@/lib/datos/gestion";
import { BUCKET_FOTOS, CAMPOS_ESTUDIANTE, EDITORES, LECTORES, NOMBRE_TIPO, OPCIONES, TIPOS, camposDe } from "@/lib/datos/estudiantes";
import Mensajes, { entrada, botonPrincipal, tarjeta } from "../../Mensajes";
import { guardarFicha } from "../acciones";
import { leerConfigSupabase } from "@/lib/supabase/config";
import FotoEstudiante from "./FotoEstudiante";

export const dynamic = "force-dynamic";

type Dato = Record<string, string | number | boolean | null>;

function Campo({ nombre, etiqueta, valor, activo }: { nombre: string; etiqueta: string; valor: string; activo: boolean }) {
  const clave = nombre.replace(/^(madre|padre|representante)_/, "");
  const lista: readonly (string | readonly [string, string])[] | undefined =
    clave === "sexo" ? OPCIONES.sexo : clave === "etnia" ? OPCIONES.etnia : clave === "lateralidad" ? OPCIONES.lateralidad
      : clave === "escolaridad" ? OPCIONES.escolaridad : clave === "parentesco" ? OPCIONES.parentesco : undefined;
  const ancho = ["direccion", "direccion_trabajo", "correo", "apellidos", "nombres", "discapacidad"].includes(clave) ? "sm:col-span-2" : "";
  return (
    <label className={`grid gap-1 text-xs text-slate-500 ${ancho}`}>
      {etiqueta}
      {lista ? (
        <select name={nombre} defaultValue={valor} disabled={!activo} className={`${entrada} w-full min-w-0`}>
          <option value="">—</option>
          {lista.map((o) => typeof o === "string"
            ? <option key={o} value={o}>{o}</option>
            : <option key={o[0]} value={o[0]}>{o[1]}</option>)}
          {valor && !lista.some((o) => (typeof o === "string" ? o : o[0]) === valor) && <option value={valor}>{valor}</option>}
        </select>
      ) : (
        <input name={nombre} defaultValue={valor} disabled={!activo}
          type={clave === "fecha_nacimiento" ? "date" : clave === "correo" ? "email" : "text"}
          required={nombre === "apellidos" || nombre === "nombres"} className={`${entrada} w-full min-w-0`} />
      )}
    </label>
  );
}

export default async function FichaPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; curso?: string }>;
}) {
  const { id } = await params;
  const { ok, error, curso } = await searchParams;
  const { supabase, inst } = await contextoGestion(LECTORES);
  const editor = inst.roles.some((r) => EDITORES.includes(r));
  const { data: e } = await supabase.from("estudiantes").select("*, familiares(*)").eq("id", id).maybeSingle();
  if (!e) notFound();
  const est = e as Dato & { familiares: Dato[] };
  const fam = (tipo: string) => est.familiares.find((f) => f.tipo === tipo) ?? {};
  const v = (x: unknown) => (x == null ? "" : String(x));
  const fotoPath = (est.foto_path as string | null) ?? null;
  const fotoUrl = fotoPath
    ? (await supabase.storage.from(BUCKET_FOTOS).createSignedUrl(fotoPath, 600)).data?.signedUrl ?? null
    : null;
  const { url, key } = leerConfigSupabase();
  const volverA = `/panel/gestion/estudiantes${curso ? `?curso=${curso}` : ""}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href={volverA} className="text-sm text-marca hover:underline">← Volver a la nómina</Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{v(est.apellidos)} {v(est.nombres)}</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Ficha del estudiante{est.cedula ? ` · C.I. ${v(est.cedula)}` : ""}</p>
        <a download href={`/panel/gestion/estudiantes/${id}/descargar`}
          className="rounded-lg border-2 border-marca bg-white px-4 py-2 text-sm font-semibold text-marca hover:bg-marca hover:text-white">
          ⬇ Descargar ficha en Word
        </a>
      </div>
      {!editor && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Solo Inspección, DECE y el administrador pueden modificar la ficha.</p>}
      <Mensajes ok={ok} error={error} />
      <section className={tarjeta}>
        <FotoEstudiante url={url} clave={key} institucionId={inst.id} estudianteId={id}
          fotoPath={fotoPath} fotoUrl={fotoUrl} editor={editor} />
      </section>

      <form action={guardarFicha}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="curso" value={curso ?? ""} />
        <section className={tarjeta}>
          <h2 className="font-semibold text-slate-900">Datos del estudiante</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {CAMPOS_ESTUDIANTE.map(([k, t]) => <Campo key={k} nombre={k} etiqueta={t} valor={v(est[k])} activo={editor} />)}
          </div>
        </section>
        {TIPOS.map((tipo) => {
          const f = fam(tipo);
          return (
            <section key={tipo} className={tarjeta}>
              <h2 className="font-semibold text-slate-900">{NOMBRE_TIPO[tipo]}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {camposDe(tipo).map(([k, t]) => <Campo key={k} nombre={`${tipo}_${k}`} etiqueta={t} valor={v(f[k])} activo={editor} />)}
              </div>
            </section>
          );
        })}
        {editor && (
          <div className="sticky bottom-0 mt-6 flex justify-end border-t border-slate-200 bg-[#f8fafc]/95 py-3">
            <button className={botonPrincipal}>Guardar ficha</button>
          </div>
        )}
      </form>
    </main>
  );
}
