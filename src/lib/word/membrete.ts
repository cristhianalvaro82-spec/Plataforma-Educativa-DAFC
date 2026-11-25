/**
 * Generador de documentos Word con la hoja membretada de cada unidad educativa.
 * Funciona en el navegador y en el servidor (librería "docx").
 * Todos los documentos de la plataforma (oficios, actas, planificaciones...)
 * se construyen sobre esta base para que el membrete sea siempre el mismo.
 */
import { telefonoValido } from "@/lib/telefono";
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HorizontalPositionRelativeFrom, ImageRun, PageNumber,
  TextWrappingType, VerticalPositionRelativeFrom,
  Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
  type ISectionOptions,
} from "docx";

export type DatosInstitucion = {
  nombre: string;
  codigoAmie?: string;
  zona?: string;
  distrito?: string;
  provincia?: string;
  canton?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  lema?: string;
  anioLectivo?: string;
  colorPrimario?: string; // "#1F4E79"
  logo?: { datos: ArrayBuffer | Uint8Array; tipo: "png" | "jpg"; proporcion?: number }; // proporcion = ancho / alto
  /** Hoja membretada oficial: imagen de fondo (A4) + lugar + líneas del pie. Si existe, reemplaza el diseño propio. */
  oficial?: { fondo: ArrayBuffer | Uint8Array; lugar?: string; pie: [string, string][] };
};

export type Firmante = { nombre: string; cargo: string; titulo?: string };

const SIN_BORDE = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const color = (inst: DatosInstitucion) => (inst.colorPrimario ?? "#011681").replace("#", "");

/** Encabezado: logo a la izquierda, datos de la institución al centro. */
export function crearEncabezado(inst: DatosInstitucion): Header {
  const lineas: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: inst.nombre.toUpperCase(), bold: true, size: 26, color: color(inst) })],
    }),
  ];
  const sub = [inst.zona && `Zona ${inst.zona}`, inst.distrito && `Distrito ${inst.distrito}`]
    .filter(Boolean).join(" · ");
  if (sub) lineas.push(linea(sub, 17));
  if (inst.codigoAmie) lineas.push(linea(`Código AMIE: ${inst.codigoAmie}`, 17));
  const lugar = [inst.canton, inst.provincia].filter(Boolean).join(" – ");
  if (lugar) lineas.push(linea(lugar, 17));
  if (inst.anioLectivo) lineas.push(linea(`Año lectivo ${inst.anioLectivo}`, 17, true));

  const celdaLogo = new TableCell({
    width: { size: 18, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    borders: SIN_BORDE,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: inst.logo
          ? [new ImageRun({ type: inst.logo.tipo, data: inst.logo.datos, transformation: { width: Math.round(75 * (inst.logo.proporcion ?? 1)), height: 75 } })]
          : [],
      }),
    ],
  });
  const celdaTexto = new TableCell({
    width: { size: 82, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    borders: SIN_BORDE,
    children: lineas,
  });

  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [celdaLogo, celdaTexto] })],
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: color(inst), space: 4 } },
        children: [],
      }),
    ],
  });
}

/** Pie de página: dirección, contacto, lema y número de página. */
export function crearPie(inst: DatosInstitucion): Footer {
  const contacto = [inst.direccion, telefonoValido(inst.telefono) && `Telf. ${telefonoValido(inst.telefono)}`, inst.correo]
    .filter(Boolean).join(" · ");
  const hijos: Paragraph[] = [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: color(inst), space: 4 } },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: contacto, size: 15, color: "555555" })],
    }),
  ];
  if (inst.lema) hijos.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `“${inst.lema}”`, italics: true, size: 15, color: "555555" })],
  }));
  hijos.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 15 })],
  }));
  return new Footer({ children: hijos });
}

/** Bloque de firma centrado. */
export function bloqueFirma(f: Firmante): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 900 }, alignment: AlignmentType.CENTER, children: [new TextRun("______________________________")] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: [f.titulo, f.nombre].filter(Boolean).join(" "), bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(f.cargo.toUpperCase())] }),
  ];
}

// ---------------------------------------------------------------------
// Hoja membretada oficial (fondo del Ministerio + bloque de la U.E.)
// ---------------------------------------------------------------------
const MORADO = "4B4A8E"; // color de los textos de la hoja oficial

/** "Unidad Educativa Dr. Andrés F. Córdova" → "DR. ANDRÉS F. CÓRDOVA" */
function nombreSinTipo(nombre: string) {
  return nombre.replace(/^\s*(unidad educativa|u\.\s*e\.)\s*/i, "").replace(/["“”]/g, "").trim().toLocaleUpperCase("es-EC");
}

export function crearEncabezadoOficial(inst: DatosInstitucion): Header {
  const of = inst.oficial!;
  // A4 = 210 × 297 mm = 793,7 × 1122,5 px a 96 ppp
  const fondo = new ImageRun({
    type: "png", data: of.fondo, transformation: { width: 794, height: 1123 },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
      behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE },
    },
  });
  const lugar = [inst.canton, inst.provincia].every(Boolean)
    ? `${inst.canton} – ${inst.provincia} - Ecuador`.toLocaleUpperCase("es-EC")
    : of.lugar ?? "";
  // Bloque centrado entre el escudo del Gobierno (izquierda) y el Ministerio (derecha).
  const linea = (texto: string, size: number, col: string, bold = true) =>
    new TextRun({ text: texto, bold, size, color: col });
  const parrafo = (runs: (TextRun | ImageRun)[], before = 0) => new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before, after: 0, line: 240 },
    indent: { left: 1170, right: 1170 }, children: runs,
  });
  // Logo de la institución en la esquina derecha, sobre "Ministerio de Educación, Deporte y Cultura".
  const extra: ImageRun[] = [fondo];
  if (inst.logo) {
    const alto = 58, ancho = Math.round(alto * (inst.logo.proporcion ?? 1));
    extra.push(new ImageRun({
      type: inst.logo.tipo, data: inst.logo.datos, transformation: { width: ancho, height: alto },
      floating: {
        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: Math.round((676 - ancho / 2) * 9525) },
        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 50 * 9525 },
        allowOverlap: true, wrap: { type: TextWrappingType.NONE },
      },
    }));
  }
  const hijos = [
    parrafo([...extra, linea("UNIDAD EDUCATIVA", 17, color(inst))], 480),
    parrafo([linea(`“${nombreSinTipo(inst.nombre)}”`, 22, color(inst))]),
  ];
  if (inst.codigoAmie) hijos.push(parrafo([linea(`AMIE ${inst.codigoAmie}`, 15, MORADO)]));
  if (lugar) hijos.push(parrafo([linea(lugar, 13, MORADO, false)]));
  return new Header({ children: hijos });
}

export function crearPieOficial(inst: DatosInstitucion): Footer {
  return new Footer({
    children: inst.oficial!.pie.map(([etiqueta, valor], i, todas) => new Paragraph({
      spacing: { after: 0, line: 220 },
      children: [
        ...(etiqueta ? [new TextRun({ text: `${etiqueta} `, bold: true, size: 15, color: MORADO })] : []),
        new TextRun({ text: valor, size: 15, color: MORADO }),
        ...(i === todas.length - 1
          ? [new TextRun({ children: ["\t\tPágina ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 14, color: "888888" })]
          : []),
      ],
      tabStops: [{ type: "right" as const, position: 8504 }],
    })),
  });
}

/** Envuelve cualquier contenido con el membrete de la institución. */
export function documentoMembretado(inst: DatosInstitucion, contenido: ISectionOptions["children"]): Document {
  const oficial = !!inst.oficial;
  return new Document({
    creator: inst.nombre,
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: oficial
            ? { top: 2550, bottom: 1950, left: 1701, right: 1701, header: 300, footer: 380 }
            : { top: 1700, bottom: 1300, left: 1400, right: 1400, header: 500, footer: 400 },
        },
      },
      headers: { default: oficial ? crearEncabezadoOficial(inst) : crearEncabezado(inst) },
      footers: { default: oficial ? crearPieOficial(inst) : crearPie(inst) },
      children: contenido,
    }],
  });
}

// ---------------------------------------------------------------------
// Plantilla 1: Oficio / Memorando
// ---------------------------------------------------------------------
export type DatosOficio = {
  tipo: "Oficio" | "Memorando" | "Circular" | "Convocatoria";
  numero: string;
  ciudad: string;
  fecha: Date;
  destinatario: { nombre: string; cargo: string };
  asunto: string;
  cuerpo: string; // párrafos separados por línea en blanco
  firmante: Firmante;
};

export function crearOficio(inst: DatosInstitucion, d: DatosOficio): Document {
  const fecha = d.fecha.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
  const parrafos = d.cuerpo.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  return documentoMembretado(inst, [
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${d.tipo} Nro. ${d.numero}`, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 300 }, children: [new TextRun(`${d.ciudad}, ${fecha}`)] }),
    new Paragraph({ children: [new TextRun(d.tipo === "Circular" ? "Para:" : "Señor/a")] }),
    new Paragraph({ children: [new TextRun({ text: d.destinatario.nombre, bold: true })] }),
    new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: d.destinatario.cargo.toUpperCase() })] }),
    new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: "Asunto: ", bold: true }), new TextRun(d.asunto)] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun("De mi consideración:")] }),
    ...parrafos.map((t) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200, line: 300 }, children: [new TextRun(t)] })),
    new Paragraph({ spacing: { before: 200 }, children: [new TextRun("Atentamente,")] }),
    ...bloqueFirma(d.firmante),
  ]);
}

function linea(texto: string, size: number, negrita = false) {
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: texto, size, bold: negrita })] });
}
