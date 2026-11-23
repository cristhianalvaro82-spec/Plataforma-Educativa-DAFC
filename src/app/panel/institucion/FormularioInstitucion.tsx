"use client";

import { useState } from "react";
import Link from "next/link";
import { clienteNavegador } from "@/lib/supabase/client";
import type { Autoridad, Institucion } from "@/lib/datos/institucion";

const campo = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50";
const CARGOS = ["Rector/a", "Vicerrector/a", "Inspector/a General"];

export default function FormularioInstitucion(props: {
  url: string; clave: string; institucion: Institucion; autoridades: Autoridad[]; logoUrl: string | null; editable: boolean;
}) {
  const [inst, setInst] = useState(props.institucion);
  const [autoridades, setAutoridades] = useState(
    CARGOS.map((cargo, orden) => {
      const a = props.autoridades.find((x) => x.cargo === cargo);
      return { cargo, orden, nombre: a?.nombre ?? "", titulo: a?.titulo ?? "" };
    }),
  );
  const [logo, setLogo] = useState<File | null>(null);
  const [vistaLogo, setVistaLogo] = useState(props.logoUrl);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const set = (k: keyof Institucion) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInst({ ...inst, [k]: e.target.value });
  const v = (k: keyof Institucion) => (inst[k] as string | null) ?? "";

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setEstado(null);
    const supabase = clienteNavegador(props.url, props.clave);
    try {
      let logo_path = inst.logo_path;
      if (logo) {
        const ext = logo.type === "image/png" ? "png" : "jpg";
        logo_path = `${inst.id}/logo-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("logos").upload(logo_path, logo, { upsert: true, contentType: logo.type });
        if (error) throw new Error("No se pudo subir el logo: " + error.message);
      }
      const { id, ...resto } = { ...inst, logo_path };
      const { error } = await supabase.from("instituciones").update(resto).eq("id", id);
      if (error) throw new Error(error.message);

      await supabase.from("autoridades").delete().eq("institucion_id", id);
      const filas = autoridades.filter((a) => a.nombre.trim())
        .map((a) => ({ institucion_id: id, cargo: a.cargo, nombre: a.nombre.trim(), titulo: a.titulo.trim() || null, orden: a.orden }));
      if (filas.length) {
        const { error: e2 } = await supabase.from("autoridades").insert(filas);
        if (e2) throw new Error(e2.message);
      }
      setInst({ ...inst, logo_path });
      setLogo(null);
      setEstado({ tipo: "ok", texto: "Datos guardados." });
    } catch (err) {
      setEstado({ tipo: "error", texto: err instanceof Error ? err.message : "Error al guardar." });
    }
    setGuardando(false);
  }

  const d = !props.editable;
  return (
    <form onSubmit={guardar} className="mt-6 grid gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Datos de la unidad educativa</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input disabled={d} className={`${campo} sm:col-span-2`} placeholder="Nombre" value={v("nombre")} onChange={set("nombre")} required />
          <input disabled={d} className={campo} placeholder="Código AMIE" value={v("codigo_amie")} onChange={set("codigo_amie")} />
          <select disabled={d} className={campo} value={v("sostenimiento")} onChange={set("sostenimiento")}>
            <option value="">Sostenimiento</option>
            <option value="fiscal">Fiscal</option>
            <option value="fiscomisional">Fiscomisional</option>
            <option value="municipal">Municipal</option>
            <option value="particular">Particular</option>
          </select>
          <input disabled={d} className={campo} placeholder="Zona" value={v("zona")} onChange={set("zona")} />
          <input disabled={d} className={campo} placeholder="Distrito" value={v("distrito")} onChange={set("distrito")} />
          <input disabled={d} className={campo} placeholder="Circuito" value={v("circuito")} onChange={set("circuito")} />
          <input disabled={d} className={campo} placeholder="Provincia" value={v("provincia")} onChange={set("provincia")} />
          <input disabled={d} className={campo} placeholder="Cantón" value={v("canton")} onChange={set("canton")} />
          <input disabled={d} className={campo} placeholder="Teléfono" value={v("telefono")} onChange={set("telefono")} />
          <input disabled={d} className={`${campo} sm:col-span-2`} placeholder="Dirección" value={v("direccion")} onChange={set("direccion")} />
          <input disabled={d} className={campo} placeholder="Correo institucional" value={v("correo")} onChange={set("correo")} />
          <input disabled={d} className={campo} placeholder="Lema (opcional)" value={v("lema")} onChange={set("lema")} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Logo y color del membrete</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {vistaLogo ? <img src={vistaLogo} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">Sin logo</span>}
          </div>
          <label className="text-sm text-slate-700">
            Logo (PNG o JPG)
            <input disabled={d} type="file" accept="image/png,image/jpeg" className="mt-1 block text-sm"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; setLogo(f); if (f) setVistaLogo(URL.createObjectURL(f)); }} />
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            Color
            <input disabled={d} type="color" value={v("color_primario") || "#1F4E79"} onChange={set("color_primario")} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold text-slate-800">Autoridades que firman</h2>
        <p className="mb-3 text-sm text-slate-500">Se usan en las firmas de oficios, actas y planificaciones.</p>
        <div className="grid gap-3">
          {autoridades.map((a, i) => (
            <div key={a.cargo} className="grid grid-cols-[140px_90px_1fr] items-center gap-3">
              <span className="text-sm font-medium text-slate-700">{a.cargo}</span>
              <input disabled={d} className={campo} placeholder="Título" value={a.titulo}
                onChange={(e) => setAutoridades(autoridades.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))} />
              <input disabled={d} className={campo} placeholder="Nombre completo" value={a.nombre}
                onChange={(e) => setAutoridades(autoridades.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} />
            </div>
          ))}
        </div>
      </section>

      {estado && (
        <p className={`rounded-lg px-3 py-2 text-sm ${estado.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{estado.texto}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {props.editable && (
          <button disabled={guardando} className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        )}
        <Link href="/membrete" className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100">
          Probar un oficio en Word
        </Link>
      </div>
    </form>
  );
}
