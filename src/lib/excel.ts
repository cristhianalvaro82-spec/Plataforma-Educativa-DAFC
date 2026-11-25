import ExcelJS from "exceljs";

/** Convierte un archivo Excel (.xlsx) o CSV, o un texto pegado desde Excel, en filas de texto. */
export async function leerFilas(archivo: File | null, pegado: string): Promise<string[][]> {
  if (archivo && archivo.size > 0) {
    const nombre = archivo.name.toLowerCase();
    if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) return filasDeTexto(await archivo.text());
    if (!nombre.endsWith(".xlsx")) throw new Error("Sube un archivo .xlsx (Excel) o .csv. Si es .xls antiguo, ábrelo y guárdalo como .xlsx.");
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(await archivo.arrayBuffer());
    const filas: string[][] = [];
    // Solo la primera hoja: las demás pueden tener tablas de referencia.
    const hoja = libro.worksheets[0];
    hoja?.eachRow({ includeEmpty: false }, (fila) => {
      const valores = (fila.values as unknown[]).slice(1).map(textoCelda);
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
