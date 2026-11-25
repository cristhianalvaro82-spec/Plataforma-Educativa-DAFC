import ExcelJS from "exceljs";

/** Convierte un archivo Excel (.xlsx) o CSV, o un texto pegado desde Excel, en filas de texto. */
export async function leerFilas(archivo: File | null, pegado: string): Promise<string[][]> {
  if (archivo && archivo.size > 0) {
    const nombre = archivo.name.toLowerCase();
    if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) return filasDeTexto(await archivo.text());
    if (nombre.endsWith(".xls") || nombre.endsWith(".htm") || nombre.endsWith(".html")) {
      // Sistema Orozco y otros sistemas exportan una tabla HTML con extensión .xls.
      const texto = new TextDecoder("utf-8").decode(await archivo.arrayBuffer());
      if (/<table/i.test(texto)) return filasDeHtml(texto);
      throw new Error("Este .xls es del formato antiguo de Excel. Ábrelo en Excel y usa Guardar como → Libro de Excel (.xlsx).");
    }
    if (!nombre.endsWith(".xlsx")) throw new Error("Sube un archivo de Excel (.xlsx o .xls) o .csv.");
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(await archivo.arrayBuffer());
    const filas: string[][] = [];
    // Solo la primera hoja: las demás pueden tener tablas de referencia.
    const hoja = libro.worksheets[0];
    hoja?.eachRow({ includeEmpty: false }, (fila) => {
      const valores = Array.from(fila.values as unknown[]).slice(1).map(textoCelda);
      if (valores.some(Boolean)) filas.push(valores);
    });
    return filas;
  }
  return filasDeTexto(pegado);
}

function textoCelda(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join("").trim();
    if (o.text != null) return String(o.text).trim();
    if (o.result != null) return String(o.result).trim();
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

function filasDeTexto(texto: string): string[][] {
  return texto.split(/\r?\n/).map((l) => {
    const sep = l.includes("\t") ? "\t" : l.includes(";") ? ";" : ",";
    return l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
  }).filter((f) => f.some(Boolean));
}

const ENTIDADES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodificar(t: string) {
  return t.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTIDADES[e.toLowerCase()] ?? m;
  });
}

/** Lee las filas de una tabla HTML; una celda con colspan ocupa varias columnas (texto en la primera). */
function filasDeHtml(html: string): string[][] {
  const filas: string[][] = [];
  for (const [, tr] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const fila: string[] = [];
    for (const [, attrs, contenido] of tr.matchAll(/<t[hd]([^>]*)>([\s\S]*?)<\/t[hd]>/gi)) {
      const texto = decodificar(contenido.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
      const span = Math.max(1, Math.min(50, parseInt(attrs.match(/colspan\s*=\s*["']?(\d+)/i)?.[1] ?? "1", 10)));
      fila.push(texto, ...Array(span - 1).fill(""));
    }
    if (fila.some(Boolean)) filas.push(fila);
  }
  return filas;
}
