import ExcelJS from "exceljs";
import { contextoGestion } from "@/lib/datos/gestion";
import { encabezadosPlantilla, OPCIONES } from "@/lib/datos/estudiantes";

export const dynamic = "force-dynamic";

const EJEMPLO = [
  ["1799999991", "ANDRADE VERA", "MATEO JOSÉ", "H", "14/03/2010", "Ecuatoriana", "Manabí", "Mestizo/a", "", "Diestro/a", "58", "168", "Barrio Santa Rosa", "0990000001", "",
    "1799999901", "VERA LOOR", "MARÍA ELENA", "0990000011", "Mercado central", "Ecuatoriana", "Bachillerato", "Comerciante",
    "1799999902", "ANDRADE PAZ", "LUIS ALBERTO", "0990000012", "Taller San José", "Ecuatoriana", "Educación Básica", "Mecánico",
    "1799999901", "VERA LOOR", "MARÍA ELENA", "Madre", "0990000011", "madre.ficticia@correo.com", "Ecuatoriana", "Bachillerato", "Comerciante"],
  ["1799999992", "BRAVO CEDEÑO", "VALENTINA", "M", "02/09/2009", "Ecuatoriana", "Santo Domingo de los Tsáchilas", "Montubio/a", "", "Zurdo/a", "52", "160", "Sector 5, La Concordia", "0990000002", "",
    "1799999903", "CEDEÑO MERA", "ROSA", "0990000021", "", "Ecuatoriana", "Educación Básica", "Quehaceres domésticos",
    "", "", "", "", "", "", "", "",
    "1799999904", "BRAVO CEDEÑO", "CARMEN", "Hermano/a", "0990000022", "", "Ecuatoriana", "Tercer nivel", "Docente"],
  ["1799999993", "CHÁVEZ MOREIRA", "DANIEL ALEJANDRO", "H", "21/06/2010", "Ecuatoriana", "Esmeraldas", "Afroecuatoriano/a", "", "Diestro/a", "61", "171", "Recinto El Paraíso", "", "",
    "", "", "", "", "", "", "", "",
    "1799999905", "CHÁVEZ ORTIZ", "PEDRO", "0990000031", "Finca El Paraíso", "Ecuatoriana", "Bachillerato", "Agricultor",
    "1799999905", "CHÁVEZ ORTIZ", "PEDRO", "Padre", "0990000031", "", "Ecuatoriana", "Bachillerato", "Agricultor"],
];

/** Descarga la plantilla vacía, o con ?ejemplo=1 una nómina ficticia para practicar. */
export async function GET(req: Request) {
  await contextoGestion(["administrador", "inspeccion", "dece", "vicerrectorado", "autoridad"]);
  const ejemplo = new URL(req.url).searchParams.get("ejemplo") === "1";
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Estudiantes", { views: [{ state: "frozen", ySplit: 1, xSplit: 3 }] });
  const enc = encabezadosPlantilla();
  hoja.addRow(enc);
  const fila1 = hoja.getRow(1);
  fila1.height = 32;
  enc.forEach((h, i) => {
    const celda = fila1.getCell(i + 1);
    const color = h.startsWith("Madre") ? "FFE10108" : h.startsWith("Padre") ? "FF1E3067" : h.startsWith("Representante") ? "FFCCB325" : "FF011681";
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.alignment = { wrapText: true, vertical: "middle" };
    hoja.getColumn(i + 1).width = Math.max(14, Math.min(28, h.length + 2));
    // Cédulas y celulares como texto, para que Excel no borre el 0 inicial.
    if (/Cédula|Celular/.test(h)) hoja.getColumn(i + 1).numFmt = "@";
  });
  if (ejemplo) EJEMPLO.forEach((f) => hoja.addRow(f));
  // Listas desplegables
  const lista = (col: number, valores: readonly string[]) => {
    for (let r = 2; r <= 80; r++) hoja.getCell(r, col).dataValidation = { type: "list", allowBlank: true, formulae: [`"${valores.join(",")}"`] };
  };
  enc.forEach((h, i) => {
    if (h === "Sexo (H/M)") lista(i + 1, ["H", "M"]);
    if (h === "Identificación étnica") lista(i + 1, OPCIONES.etnia);
    if (h === "Lateralidad") lista(i + 1, OPCIONES.lateralidad);
    if (h.endsWith("Escolaridad")) lista(i + 1, OPCIONES.escolaridad);
    if (h.endsWith("Parentesco")) lista(i + 1, OPCIONES.parentesco);
  });
  const ayuda = libro.addWorksheet("Instrucciones");
  [
    "Cómo llenar la plantilla",
    "1. Una fila por estudiante. Apellidos y Nombres son obligatorios; lo demás puede quedar vacío.",
    "2. Escribe la cédula completa (10 dígitos). Si ya existe en la plataforma, se actualiza en vez de duplicarse.",
    "3. Fecha de nacimiento: día/mes/año, por ejemplo 14/03/2010.",
    "4. Sexo: H (hombre) o M (mujer).",
    "5. Columnas rojas: madre. Azules oscuras: padre. Doradas: representante legal.",
    "6. Si el representante es la madre o el padre, copia sus datos y elige el parentesco.",
    "7. En la plataforma: Gestión → Estudiantes → elige el curso → Importar.",
  ].forEach((t, i) => { const f = ayuda.addRow([t]); if (i === 0) f.font = { bold: true, size: 14 }; });
  ayuda.getColumn(1).width = 110;

  const buffer = await libro.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${ejemplo ? "nomina-ejemplo-ficticia" : "plantilla-estudiantes"}.xlsx"`,
    },
  });
}
