"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/client";

import { BUCKET_FOTOS } from "@/lib/datos/estudiantes";

/** Recorta al centro en proporción carné (3:4) y reduce a 360×480 en JPG. */
async function prepararFoto(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const W = 360, H = 480, objetivo = W / H;
  let sw = bmp.width, sh = bmp.height, sx = 0, sy = 0;
  if (sw / sh > objetivo) { sw = Math.round(sh * objetivo); sx = Math.round((bmp.width - sw) / 2); }
  else { sh = Math.round(sw / objetivo); sy = Math.round((bmp.height - sh) / 4); } // deja más espacio arriba (cabeza)
  const lienzo = document.createElement("canvas");
  lienzo.width = W; lienzo.height = H;
  const ctx = lienzo.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, W, H);
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la foto"))), "image/jpeg", 0.85));
}

export default function FotoEstudiante(props: {
  url: string; clave: string; institucionId: string; estudianteId: string;
  fotoPath: string | null; fotoUrl: string | null; editor: boolean;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [vista, setVista] = useState(props.fotoUrl);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  async function cambiar(nuevoPath: string | null, blob?: Blob) {
    setTrabajando(true); setEstado(null);
    const supabase = clienteNavegador(props.url, props.clave);
    try {
      if (nuevoPath && blob) {
        const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(nuevoPath, blob, { contentType: "image/jpeg", upsert: true });
        if (error) throw new Error(/bucket/i.test(error.message)
          ? "Falta activar las fotos en la base de datos (archivo 0006_fotos.sql)." : "No se pudo subir la foto: " + error.message);
      }
      const { error } = await supabase.from("estudiantes").update({ foto_path: nuevoPath }).eq("id", props.estudianteId);
      if (error) throw new Error(error.message);
      if (props.fotoPath && props.fotoPath !== nuevoPath) await supabase.storage.from(BUCKET_FOTOS).remove([props.fotoPath]);
      setVista(blob ? URL.createObjectURL(blob) : null);
      setEstado({ tipo: "ok", texto: nuevoPath ? "Foto guardada." : "Foto quitada." });
      router.refresh();
    } catch (e) {
      setEstado({ tipo: "error", texto: e instanceof Error ? e.message : "Error con la foto." });
    } finally {
      setTrabajando(false);
    }
  }

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      const blob = await prepararFoto(archivo);
      await cambiar(`${props.institucionId}/${props.estudianteId}/foto-${Date.now()}.jpg`, blob);
    } catch {
      setEstado({ tipo: "error", texto: "No pude leer esa imagen. Usa una foto JPG o PNG." });
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
        {vista
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={vista} alt="Foto del estudiante" className="h-full w-full object-cover" />
          : <span className="px-2 text-center text-xs text-slate-400">Sin foto</span>}
      </div>
      <div className="grid gap-2 text-sm">
        <p className="font-semibold text-slate-900">Foto tamaño carné <span className="font-normal text-slate-500">(opcional)</span></p>
        {props.editor ? (
          <>
            <p className="text-xs text-slate-500">Desde el celular puedes tomarla con la cámara. Se recorta sola al tamaño carné.</p>
            <input ref={entrada} type="file" accept="image/*" onChange={elegir} className="hidden" />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={trabajando} onClick={() => entrada.current?.click()}
                className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60">
                {trabajando ? "Guardando…" : vista ? "📷 Cambiar foto" : "📷 Subir foto"}
              </button>
              {vista && (
                <button type="button" disabled={trabajando} onClick={() => cambiar(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-[#E10108] hover:text-[#E10108]">
                  Quitar foto
                </button>
              )}
            </div>
          </>
        ) : <p className="text-xs text-slate-500">Solo Inspección, DECE y el administrador pueden cambiarla.</p>}
        {estado && <p className={`text-xs ${estado.tipo === "ok" ? "text-emerald-700" : "text-red-700"}`}>{estado.texto}</p>}
      </div>
    </div>
  );
}
