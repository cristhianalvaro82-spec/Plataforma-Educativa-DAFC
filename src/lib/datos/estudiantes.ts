/**
 * Ficha del estudiante (inspirada en la de Sistema Orozco) y las columnas
 * de la plantilla Excel para importar nóminas.
 */

/** Roles que pueden editar fichas y nóminas. */
export const EDITORES = ["administrador", "inspeccion", "dece"];
/** Roles que pueden ver todas las fichas. */
export const LECTORES = [...EDITORES, "vicerrectorado", "autoridad"];

export type Tipo = "madre" | "padre" | "representante";
export const TIPOS: Tipo[] = ["madre", "padre", "representante"];
export const NOMBRE_TIPO: Record<Tipo, string> = { madre: "Madre", padre: "Padre", representante: "Representante legal" };

export const CAMPOS_ESTUDIANTE = [
  ["cedula", "Cédula"],
  ["apellidos", "Apellidos"],
  ["nombres", "Nombres"],
  ["sexo", "Sexo (H/M)"],
  ["fecha_nacimiento", "Fecha de nacimiento"],
  ["nacionalidad", "Nacionalidad"],
  ["provincia_nacimiento", "Provincia de nacimiento"],
  ["etnia", "Identificación étnica"],
  ["discapacidad", "Discapacidad"],
  ["lateralidad", "Lateralidad"],
  ["peso_kg", "Peso (kg)"],
  ["talla_cm", "Talla (cm)"],
  ["direccion", "Dirección"],
  ["celular", "Celular"],
  ["correo", "Correo"],
] as const;

export const CAMPOS_FAMILIAR = [
  ["cedula", "Cédula"],
  ["apellidos", "Apellidos"],
  ["nombres", "Nombres"],
  ["parentesco", "Parentesco"],
  ["celular", "Celular"],
  ["correo", "Correo"],
  ["direccion_trabajo", "Dirección de trabajo"],
  ["nacionalidad", "Nacionalidad"],
  ["escolaridad", "Escolaridad"],
  ["ocupacion", "Ocupación"],
] as const;

/** Campos de cada familiar (madre y padre no llevan parentesco ni correo, como en Orozco). */
export function camposDe(tipo: Tipo) {
  return CAMPOS_FAMILIAR.filter(([k]) => tipo === "representante" ? k !== "direccion_trabajo" : k !== "parentesco" && k !== "correo");
}

export const OPCIONES = {
  sexo: [["H", "Hombre"], ["M", "Mujer"]],
  etnia: ["Mestizo/a", "Indígena", "Afroecuatoriano/a", "Montubio/a", "Blanco/a", "Otro"],
  lateralidad: ["Diestro/a", "Zurdo/a", "Ambidiestro/a"],
  escolaridad: ["Ninguna", "Educación Básica", "Bachillerato", "Tercer nivel", "Cuarto nivel"],
  parentesco: ["Madre", "Padre", "Abuelo/a", "Tío/a", "Hermano/a", "Otro"],
} as const;

/** Encabezados de la plantilla: estudiante, luego "Madre - …", "Padre - …", "Representante - …". */
export function encabezadosPlantilla() {
  const h: string[] = CAMPOS_ESTUDIANTE.map(([, t]) => t);
  for (const tipo of TIPOS) {
    const pref = tipo === "representante" ? "Representante" : NOMBRE_TIPO[tipo];
    for (const [, t] of camposDe(tipo)) h.push(`${pref} - ${t}`);
  }
  return h;
}

// ---------- Lectura de la nómina ----------

export const sinTildes = (s: string) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const PALABRAS: Record<string, RegExp> = {
  cedula: /c[eé]dula|identificaci[oó]n$|^ci$|documento|dni|pasaporte/,
  apellidos_nombres: /apellidos? y nombres?|nombres? y apellidos?|nombres? completos?|estudiante$/,
  apellidos: /apellido/,
  nombres: /nombre/,
  sexo: /sexo|g[eé]nero/,
  fecha_nacimiento: /fecha/,
  nacionalidad: /nacionalidad/,
  provincia_nacimiento: /provincia/,
  etnia: /etni|autoidentific/,
  discapacidad: /discapacidad|nee/,
  lateralidad: /lateralidad/,
  peso_kg: /peso/,
  talla_cm: /talla|estatura/,
  direccion_trabajo: /trabajo/,
  direccion: /direcci[oó]n|domicilio/,
  celular: /celular|tel[eé]fono|m[oó]vil/,
  correo: /correo|e-?mail|cuenta/,
  parentesco: /parentesco|relaci[oó]n/,
  escolaridad: /escolaridad|instrucci[oó]n|estudios/,
  ocupacion: /ocupaci[oó]n|profesi[oó]n/,
};
const ORDEN = ["apellidos_nombres", "cedula", "fecha_nacimiento", "provincia_nacimiento", "direccion_trabajo", "apellidos", "nombres",
  "sexo", "nacionalidad", "etnia", "discapacidad", "lateralidad", "peso_kg", "talla_cm", "direccion", "celular", "correo", "parentesco", "escolaridad", "ocupacion"];

function quienEs(h: string): "estudiante" | Tipo {
  if (/madre/.test(h) && !/parentesco/.test(h)) return "madre";
  if (/padre/.test(h) && !/parentesco/.test(h)) return "padre";
  if (/represent/.test(h)) return "representante";
  return "estudiante";
}

function campoDe(h: string) {
  return ORDEN.find((k) => PALABRAS[k].test(h)) ?? null;
}

export type FilaEstudiante = {
  estudiante: Record<string, string>;
  familiares: Partial<Record<Tipo, Record<string, string>>>;
};

/** Divide "PÉREZ LOOR JUAN CARLOS" en apellidos (2 primeras palabras) y nombres. */
export function dividirNombreCompleto(t: string) {
  const p = t.replace(/\s+/g, " ").trim().split(" ");
  if (p.length <= 2) return { apellidos: p[0] ?? "", nombres: p.slice(1).join(" ") };
  return { apellidos: p.slice(0, 2).join(" "), nombres: p.slice(2).join(" ") };
}

export function normalizarCedula(c: string) {
  const d = c.replace(/[^\dA-Za-z]/g, "");
  return /^\d{9}$/.test(d) ? "0" + d : d; // Excel suele borrar el 0 inicial
}

/** Devuelve la fecha como AAAA-MM-DD solo si existe de verdad (0000-00-00 y similares → vacía). */
export function normalizarFecha(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  let a = 0, m = 0, d = 0;
  let x = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (x) [a, m, d] = [+x[1], +x[2], +x[3]];
  else if ((x = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [a, m, d] = [+x[3], +x[2], +x[1]];
  else if (/^\d{5}$/.test(t)) { // número de serie de Excel
    const f = new Date(Date.UTC(1899, 11, 30) + Number(t) * 86400000);
    [a, m, d] = [f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate()];
  } else return null;
  const f = new Date(Date.UTC(a, m - 1, d));
  if (a < 1900 || a > 2100 || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function normalizarSexo(v: string) {
  const s = sinTildes(v);
  if (/^(h|m(asculino)?|hombre|varon)$/.test(s) && s !== "m") return "H";
  if (s === "m" || /^(f|femenino|mujer)$/.test(s)) return "M";
  return null;
}

/**
 * Convierte las filas del Excel en estudiantes. Busca la fila de encabezados
 * (la que menciona "apellido" o "nombre") y reconoce las columnas por su texto.
 */
export function interpretarNomina(filas: string[][]): { registros: FilaEstudiante[]; columnasReconocidas: number } {
  const iEnc = filas.findIndex((f) => f.some((c) => /apellido|nombre/.test(sinTildes(c))));
  if (iEnc < 0) return { registros: [], columnasReconocidas: 0 };
  // Encabezados de grupo (una fila arriba con "MADRE", "PADRE"...) se heredan hacia la derecha.
  const grupo = iEnc > 0 ? filas[iEnc - 1] : [];
  let grupoActual = "";
  const mapa = filas[iEnc].map((c, i) => {
    if (grupo[i]) grupoActual = sinTildes(grupo[i]);
    const h = sinTildes(c);
    const quien = quienEs(h) !== "estudiante" ? quienEs(h) : quienEs(grupoActual);
    return { quien, campo: h ? campoDe(h) : null };
  });
  const usados = new Set<string>();
  const columnas = mapa.map((m) => {
    const clave = `${m.quien}.${m.campo}`;
    if (!m.campo || usados.has(clave)) return null;
    usados.add(clave);
    return m;
  });

  // Columna "No." (como en la nómina del Ministerio): si existe, solo cuentan las filas numeradas,
  // así se ignoran pies de página como "Transformar la educación...".
  const iNumero = filas[iEnc].findIndex((c) => /^(no|n|nro|num|n[°º])\.?$/.test(sinTildes(c).replace(/\s/g, "")));
  const registros: FilaEstudiante[] = [];
  for (const fila of filas.slice(iEnc + 1)) {
    if (iNumero >= 0 && !/^\d+$/.test((fila[iNumero] ?? "").trim())) continue;
    const r: FilaEstudiante = { estudiante: {}, familiares: {} };
    columnas.forEach((col, i) => {
      const v = (fila[i] ?? "").trim();
      if (!col || !v) return;
      if (col.quien === "estudiante") r.estudiante[col.campo!] = v;
      else (r.familiares[col.quien] ??= {})[col.campo!] = v;
    });
    const e = r.estudiante;
    if (e.apellidos_nombres && !e.apellidos) Object.assign(e, dividirNombreCompleto(e.apellidos_nombres));
    for (const f of Object.values(r.familiares)) {
      if (f?.apellidos_nombres && !f.apellidos) Object.assign(f, dividirNombreCompleto(f.apellidos_nombres));
      if (f) delete f.apellidos_nombres;
    }
    delete e.apellidos_nombres;
    if (!e.apellidos || !e.nombres) continue;
    registros.push(r);
  }
  return { registros, columnasReconocidas: columnas.filter(Boolean).length };
}

/** Depósito privado de fotos tamaño carné (ver 0006_fotos.sql). */
export const BUCKET_FOTOS = "fotos-estudiantes";

/** Clave para reconocer a la misma persona aunque cambien tildes, espacios o mayúsculas. */
export const claveNombre = (apellidos: string, nombres: string) => `${sinTildes(apellidos)}|${sinTildes(nombres)}`;
