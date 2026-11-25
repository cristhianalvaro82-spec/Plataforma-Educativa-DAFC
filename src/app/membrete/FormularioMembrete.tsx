"use client";

import { useEffect, useState } from "react";
import { Packer } from "docx";
import { crearOficio, type DatosInstitucion } from "@/lib/word/membrete";
import { MEMBRETE_OFICIAL } from "@/lib/sitio";

async function proporcionDe(datos: ArrayBuffer): Promise<number> {
  try {
    const bmp = await createImageBitmap(new Blob([datos]));
    return bmp.width / bmp.height;
  } catch {
    return 1;
  }
}

const campo = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-marca";

export type Inicial = { inst?: Partial<DatosInstitucion>; logoUrl?: string | null; firmante?: { nombre: string; titulo: string; cargo: string } };

export default function FormularioMembrete({ inicial }: { inicial?: Inicial }) {
  const [inst, setInst] = useState<DatosInstitucion>({
    nombre: "Unidad Educativa Dr. Andrés F. Córdova",
    codigoAmie: "",
    zona: "",
    distrito: "",
    provincia: "",
    canton: "",
    direccion: "",
    telefono: "",
    correo: "",
    lema: "",
    anioLectivo: "2026-2027",
    colorPrimario: "#011681",
    ...inicial?.inst,
  });
  useEffect(() => {
    // Logo guardado de la institución o, si no hay, el logo oficial incluido en la plataforma.
    const origen = inicial?.logoUrl || "/logo-ue.png";
    fetch(origen)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then(async (datos) => {
        if (!datos) return;
        const proporcion = await proporcionDe(datos);
        setInst((i) => (i.logo ? i : { ...i, logo: { datos, tipo: origen.endsWith(".jpg") ? "jpg" : "png", proporcion } }));
      })
      .catch(() => {});
  }, [inicial?.logoUrl]);
  const [oficio, setOficio] = useState({
    tipo: "Oficio" as const,
    numero: "UE-INSP-2026-001",
    ciudad: "",
    destinatario: "Nombre del destinatario",
    cargoDest: "Cargo del destinatario",
    asunto: "Convocatoria a reunión de representantes",
    cuerpo:
      "Por medio del presente, me permito convocarle a la reunión que se realizará en las instalaciones de la institución.\n\nAgradezco de antemano su puntual asistencia.",
    firmante: inicial?.firmante?.nombre || "Nombre del firmante",
    cargoFirm: inicial?.firmante?.cargo || "Inspector General",
    tituloFirm: inicial?.firmante?.titulo ?? "Lic.",
  });
  const [generando, setGenerando] = useState(false);

  const set = (k: keyof DatosInstitucion) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInst({ ...inst, [k]: e.target.value });
  const setO = (k: keyof typeof oficio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setOficio({ ...oficio, [k]: e.target.value });

  async function cargarLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const tipo = archivo.type === "image/png" ? "png" : "jpg";
    const datos = await archivo.arrayBuffer();
    setInst({ ...inst, logo: { datos, tipo: tipo as "png" | "jpg", proporcion: await proporcionDe(datos) } });
  }

  async function descargar() {
    setGenerando(true);
    try {
      // Hoja membretada oficial del Ministerio como fondo de la página.
      const r = await fetch(MEMBRETE_OFICIAL.fondo).catch(() => null);
      const fondo = r && r.ok ? await r.arrayBuffer() : null;
      const base = fondo ? { ...inst, oficial: { fondo, lugar: MEMBRETE_OFICIAL.lugar, pie: MEMBRETE_OFICIAL.pie } } : inst;
      const doc = crearOficio(base, {
        tipo: oficio.tipo,
        numero: oficio.numero,
        ciudad: oficio.ciudad || inst.canton || "Ecuador",
        fecha: new Date(),
        destinatario: { nombre: oficio.destinatario, cargo: oficio.cargoDest },
        asunto: oficio.asunto,
        cuerpo: oficio.cuerpo,
        firmante: { nombre: oficio.firmante, cargo: oficio.cargoFirm, titulo: oficio.tituloFirm },
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${oficio.tipo}-${oficio.numero}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Mi institución y membrete</h1>
      <p className="mt-1 text-slate-600">
        {inicial?.inst
          ? "Los datos vienen de tu institución. Puedes ajustarlos aquí solo para este documento."
          : "Completa los datos de tu unidad educativa y descarga un oficio de prueba en Word con tu hoja membretada."}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">1. Datos de la institución</h2>
          <div className="grid gap-3">
            <input className={campo} placeholder="Nombre de la unidad educativa" value={inst.nombre} onChange={set("nombre")} />
            <div className="grid grid-cols-2 gap-3">
              <input className={campo} placeholder="Código AMIE" value={inst.codigoAmie} onChange={set("codigoAmie")} />
              <input className={campo} placeholder="Año lectivo" value={inst.anioLectivo} onChange={set("anioLectivo")} />
              <input className={campo} placeholder="Zona" value={inst.zona} onChange={set("zona")} />
              <input className={campo} placeholder="Distrito" value={inst.distrito} onChange={set("distrito")} />
              <input className={campo} placeholder="Provincia" value={inst.provincia} onChange={set("provincia")} />
              <input className={campo} placeholder="Cantón" value={inst.canton} onChange={set("canton")} />
            </div>
            <input className={campo} placeholder="Dirección" value={inst.direccion} onChange={set("direccion")} />
            <div className="grid grid-cols-2 gap-3">
              <input className={campo} placeholder="Teléfono (opcional)" value={inst.telefono} onChange={set("telefono")} />
              <input className={campo} placeholder="Correo institucional" value={inst.correo} onChange={set("correo")} />
            </div>
            <input className={campo} placeholder="Lema (opcional)" value={inst.lema} onChange={set("lema")} />
            <label className="flex items-center gap-3 text-sm text-slate-700">
              Color del membrete
              <input type="color" value={inst.colorPrimario} onChange={set("colorPrimario")} />
            </label>
            <label className="text-sm text-slate-700">
              Logo (PNG o JPG)
              <input type="file" accept="image/png,image/jpeg" onChange={cargarLogo} className="mt-1 block text-sm" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">2. Oficio de prueba</h2>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input className={campo} placeholder="Número" value={oficio.numero} onChange={setO("numero")} />
              <input className={campo} placeholder="Ciudad" value={oficio.ciudad} onChange={setO("ciudad")} />
            </div>
            <input className={campo} placeholder="Destinatario" value={oficio.destinatario} onChange={setO("destinatario")} />
            <input className={campo} placeholder="Cargo del destinatario" value={oficio.cargoDest} onChange={setO("cargoDest")} />
            <input className={campo} placeholder="Asunto" value={oficio.asunto} onChange={setO("asunto")} />
            <textarea className={campo} rows={5} value={oficio.cuerpo} onChange={setO("cuerpo")} />
            <div className="grid grid-cols-3 gap-3">
              <input className={campo} placeholder="Título" value={oficio.tituloFirm} onChange={setO("tituloFirm")} />
              <input className={`${campo} col-span-2`} placeholder="Firmante" value={oficio.firmante} onChange={setO("firmante")} />
            </div>
            <input className={campo} placeholder="Cargo del firmante" value={oficio.cargoFirm} onChange={setO("cargoFirm")} />
            <button
              onClick={descargar}
              disabled={generando}
              className="mt-2 rounded-lg bg-marca px-4 py-2.5 font-medium text-white hover:bg-marca-oscuro disabled:opacity-60"
            >
              {generando ? "Generando…" : "Descargar Word"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
