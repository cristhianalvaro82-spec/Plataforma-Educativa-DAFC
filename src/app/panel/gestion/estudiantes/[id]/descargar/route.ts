import {
  AlignmentType, BorderStyle, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { contextoGestion } from "@/lib/datos/gestion";
import { institucionDelUsuario, urlLogo } from "@/lib/datos/institucion";
import { leerConfigSupabase } from "@/lib/supabase/config";
import { CAMPOS_ESTUDIANTE, LECTORES, NOMBRE_TIPO, TIPOS, camposDe } from "@/lib/datos/estudiantes";
import { bloqueFirma, documentoMembretado, type DatosInstitucion } from "@/lib/word/membrete";
import { medirImagen } from "@/lib/word/imagen";

export const dynamic = "force-dynamic";

type Dato = Record<string, string | number | boolean | null>;
const BORDE = { style: BorderStyle.SINGLE, size: 4, color: "B9C4EA" };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

function formatear(k: string, v: unknown) {
  if (v == null || v === "") return "";
  if (k === "sexo") return v === "H" ? "Hombre" : v === "M" ? "Mujer" : String(v);
  if (k === "fecha_nacimiento") { const [a, m, d] = String(v).split("-"); return `${d}/${m}/${a}`; }
  return String(v);
}

/** Tabla de 4 columnas: etiqueta | valor | etiqueta | valor. */
function tablaDatos(titulo: string, color: string, pares: [string, string][]) {
  const filas: TableRow[] = [
    new TableRow({ children: [new TableCell({
      columnSpan: 4, borders: BORDES, shading: { type: ShadingType.CLEAR, fill: color, color: "auto" },
      children: [new Paragraph({ children: [new TextRun({ text: titulo.toUpperCase(), bold: true, color: "FFFFFF", size: 20 })] })],
    })] }),
  ];
  for (let i = 0; i < pares.length; i += 2) {
    const celdas = [pares[i], pares[i + 1] ?? ["", ""]].flatMap(([e, v]) => [
      new TableCell({ borders: BORDES, width: { size: 18, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: "EEF1FA", color: "auto" },
        children: [new Paragraph({ children: [new TextRun({ text: e, bold: true, size: 17 })] })] }),
      new TableCell({ borders: BORDES, width: { size: 32, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: v, size: 18 })] })] }),
    ]);
    filas.push(new TableRow({ children: celdas }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas });
}

/** Descarga la ficha individual del estudiante en Word, con el membrete de la institución. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await contextoGestion(LECTORES);
  const { data: e } = await supabase.from("estudiantes").select("*, familiares(*)").eq("id", id).maybeSingle();
  if (!e) return new Response("No encontrado", { status: 404 });
  const est = e as Dato & { familiares: Dato[] };
  const { data: mats } = await supabase.from("matriculas")
    .select("numero_lista, cursos(grado, paralelo, jornada, especialidad, anios_lectivos(nombre, activo))").eq("estudiante_id", id);
  type Mat = { numero_lista: number | null; cursos: { grado: string; paralelo: string; jornada: string; especialidad: string | null; anios_lectivos: { nombre: string; activo: boolean } | null } | null };
  const mat = ((mats ?? []) as unknown as Mat[]).find((m) => m.cursos?.anios_lectivos?.activo) ?? (mats as unknown as Mat[] | null)?.[0];

  const datos = await institucionDelUsuario();
  const i = datos?.institucion;
  const inst: DatosInstitucion = {
    nombre: i?.nombre ?? "Unidad Educativa", codigoAmie: i?.codigo_amie ?? "", zona: i?.zona ?? "", distrito: i?.distrito ?? "",
    provincia: i?.provincia ?? "", canton: i?.canton ?? "", direccion: i?.direccion ?? "", telefono: i?.telefono ?? "",
    correo: i?.correo ?? "", lema: i?.lema ?? "", colorPrimario: i?.color_primario ?? "#011681",
    anioLectivo: mat?.cursos?.anios_lectivos?.nombre,
  };
  try {
    const logoUrl = urlLogo(leerConfigSupabase().url, i?.logo_path ?? null) ?? new URL("/logo-ue.png", req.url).toString();
    const r = await fetch(logoUrl);
    if (r.ok) {
      const bytes = new Uint8Array(await r.arrayBuffer());
      const medida = medirImagen(bytes);
      if (medida) inst.logo = { datos: bytes, ...medida };
    }
  } catch { /* sin logo */ }

  const color = (inst.colorPrimario ?? "#011681").replace("#", "");
  const curso = mat?.cursos ? `${mat.cursos.grado} "${mat.cursos.paralelo}" · Jornada ${mat.cursos.jornada}${mat.cursos.especialidad ? ` · ${mat.cursos.especialidad}` : ""}` : "";
  const v = (x: unknown) => (x == null ? "" : String(x));
  const nombre = `${v(est.apellidos)} ${v(est.nombres)}`.trim();

  const contenido = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [new TextRun({ text: "FICHA DEL ESTUDIANTE", bold: true, size: 28, color })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: [curso, mat?.numero_lista ? `N.º de lista ${mat.numero_lista}` : ""].filter(Boolean).join(" · "), size: 18, color: "555555" })] }),
    tablaDatos("Datos del estudiante", color,
      CAMPOS_ESTUDIANTE.map(([k, t]) => [t.replace(" (H/M)", ""), formatear(k, est[k])] as [string, string])),
    ...TIPOS.flatMap((tipo) => {
      const f = est.familiares.find((x) => x.tipo === tipo) ?? {};
      return [
        new Paragraph({ spacing: { after: 120 }, children: [] }),
        tablaDatos(NOMBRE_TIPO[tipo], tipo === "madre" ? "E10108" : tipo === "padre" ? "1E3067" : "8A7A1F",
          camposDe(tipo).map(([k, t]) => [t, v(f[k])] as [string, string])),
      ];
    }),
    new Paragraph({ spacing: { before: 200, after: 600 }, children: [
      new TextRun({ text: `Fecha de emisión: ${new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Guayaquil" })}`, size: 18 }),
    ] }),
    ...bloqueFirma({
      nombre: (() => { const r = est.familiares.find((x) => x.tipo === "representante"); return r ? `${v(r.apellidos)} ${v(r.nombres)}`.trim() : ""; })(),
      cargo: "Representante legal",
    }),
  ];

  const doc = documentoMembretado(inst, contenido);
  const buffer = await Packer.toBuffer(doc);
  const archivo = `Ficha ${nombre}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w .-]/g, "").slice(0, 80);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${archivo}.docx"`,
    },
  });
}
