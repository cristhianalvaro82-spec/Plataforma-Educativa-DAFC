/** Grados del Sistema Nacional de Educación y su subnivel. */
export const GRADOS: { grado: string; subnivel: string }[] = [
  { grado: "Inicial 1", subnivel: "inicial" },
  { grado: "Inicial 2", subnivel: "inicial" },
  { grado: "1.º EGB", subnivel: "preparatoria" },
  { grado: "2.º EGB", subnivel: "elemental" },
  { grado: "3.º EGB", subnivel: "elemental" },
  { grado: "4.º EGB", subnivel: "elemental" },
  { grado: "5.º EGB", subnivel: "media" },
  { grado: "6.º EGB", subnivel: "media" },
  { grado: "7.º EGB", subnivel: "media" },
  { grado: "8.º EGB", subnivel: "superior" },
  { grado: "9.º EGB", subnivel: "superior" },
  { grado: "10.º EGB", subnivel: "superior" },
  { grado: "1.º BGU", subnivel: "bachillerato" },
  { grado: "2.º BGU", subnivel: "bachillerato" },
  { grado: "3.º BGU", subnivel: "bachillerato" },
  { grado: "1.º BT", subnivel: "bachillerato" },
  { grado: "2.º BT", subnivel: "bachillerato" },
  { grado: "3.º BT", subnivel: "bachillerato" },
];

export const NOMBRE_SUBNIVEL: Record<string, string> = {
  inicial: "Inicial",
  preparatoria: "Preparatoria",
  elemental: "Básica Elemental",
  media: "Básica Media",
  superior: "Básica Superior",
  bachillerato: "Bachillerato",
};

export const JORNADAS = ["matutina", "vespertina", "nocturna", "intensiva"];

/**
 * Tronco común de Bachillerato según el Acuerdo MINEDEC-MINEDEC-2025-00051-A
 * (16-oct-2025), art. 1. Las mismas asignaturas rigen para BGU en Ciencias.
 * Los módulos técnicos de cada figura se importan desde Excel.
 */
export const ASIGNATURAS_BASE: { nombre: string; area: string }[] = [
  { nombre: "Lengua y Literatura", area: "Lengua y Literatura" },
  { nombre: "Matemática", area: "Matemática" },
  { nombre: "Historia", area: "Ciencias Sociales" },
  { nombre: "Educación para la Ciudadanía", area: "Ciencias Sociales" },
  { nombre: "Filosofía", area: "Ciencias Sociales" },
  { nombre: "Biología", area: "Ciencias Naturales" },
  { nombre: "Física", area: "Ciencias Naturales" },
  { nombre: "Química", area: "Ciencias Naturales" },
  { nombre: "Educación Cultural y Artística", area: "Educación Cultural y Artística" },
  { nombre: "Educación Física", area: "Educación Física" },
  { nombre: "Inglés", area: "Lengua Extranjera" },
  { nombre: "Cívica y Acompañamiento Integral en el Aula", area: "Tronco común" },
  { nombre: "Emprendimiento y Gestión", area: "Tronco común" },
];

/** Figuras profesionales y opción de Bachillerato de la institución. */
export const FIGURAS = [
  "Electromecánica Automotriz",
  "Mecánica Industrial",
  "Gestión Administrativa y Logística",
  "Ciencias Generales",
];

/**
 * Horas semanales de los módulos técnicos por año (1.º, 2.º, 3.º), tomadas de
 * los planes de estudio de cada figura (PDF del Ministerio). 0 = no se dicta ese año.
 */
export const PLAN_BT: Record<string, Record<string, [number, number, number]>> = {
  "Electromecánica Automotriz": {
    "Seguridad Industrial": [2, 2, 0], "Procesos Industriales Sostenibles": [2, 2, 0], "Dibujo Técnico Aplicado": [2, 2, 0],
    "Motores": [0, 3, 7], "Tren de Rodaje": [5, 4, 3], "Metalmecánica Aplicada al Vehículo": [4, 2, 0],
    "Sistemas Eléctricos y Electrónicos": [4, 4, 7], "Módulo Práctico Experimental": [2, 2, 4],
  },
  "Mecánica Industrial": {
    "Seguridad Industrial": [2, 2, 0], "Procesos Industriales Sostenibles": [2, 2, 0], "Dibujo Técnico Aplicado": [3, 3, 0],
    "Fundamentos de Metrología y Control de Calidad": [3, 0, 0], "Cálculo Mecánico y Estructural": [3, 2, 0],
    "Mecanizado por Arranque de Viruta": [6, 5, 8], "Soldadura": [0, 5, 8], "Diseño Asistido por Computador (CAD)": [0, 0, 3],
    "Módulo Práctico Experimental": [2, 2, 2],
  },
  "Gestión Administrativa y Logística": {
    "Herramientas Informáticas Empresariales": [3, 2, 0], "Gestión Contable y Administración Financiera": [5, 4, 0],
    "Inglés Técnico Aplicado a los Negocios": [3, 2, 0], "Compras y Logística": [3, 4, 6],
    "Gestión Comercial y Comunicación": [2, 4, 6], "Gestión de Procesos Administrativos": [3, 3, 6],
    "Módulo Práctico Experimental": [2, 2, 3],
  },
};

const simple = (s: string) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const FIGURAS_TECNICAS = FIGURAS.filter((f) => f !== "Ciencias Generales");

/** Año de bachillerato (0, 1 o 2) según el grado, o null si no es bachillerato. */
export function anioBachillerato(grado: string): number | null {
  const m = grado.match(/^([123])\.º (BT|BGU)/);
  return m ? Number(m[1]) - 1 : null;
}

/**
 * Asignaturas que corresponden a un curso: el tronco común en todos, y solo los
 * módulos técnicos de su figura profesional (con las horas sugeridas de ese año).
 */
export function asignaturasDelCurso<T extends { nombre: string; area: string | null }>(
  todas: T[], especialidad: string | null, grado: string,
): (T & { sugeridas: number | null })[] {
  const fig = simple(especialidad ?? "");
  const tecnica = FIGURAS_TECNICAS.some((f) => simple(f) === fig);
  const anio = anioBachillerato(grado);
  const plan = Object.entries(PLAN_BT).find(([f]) => simple(f) === fig)?.[1] ?? {};
  const horasPlan = new Map(Object.entries(plan).map(([n, h]) => [simple(n), h]));
  const resultado: (T & { sugeridas: number | null })[] = [];
  for (const a of todas) {
    const area = simple(a.area ?? "");
    const deFiguras = FIGURAS_TECNICAS.filter((f) => area.includes(simple(f)));
    const deTodasBT = /bachillerato tecnico|todas las figuras/.test(area);
    const esTecnica = deFiguras.length > 0 || deTodasBT || horasPlanGlobal.has(simple(a.nombre));
    if (esTecnica) {
      if (!tecnica) continue; // BGU, EGB, etc.: sin módulos técnicos
      const propia = deFiguras.some((f) => simple(f) === fig) || deTodasBT || horasPlan.has(simple(a.nombre));
      if (!propia) continue;
      const h = horasPlan.get(simple(a.nombre));
      if (h && anio !== null && h[anio] === 0) continue; // no se dicta en este año
      resultado.push({ ...a, sugeridas: h && anio !== null ? h[anio] : null });
    } else {
      resultado.push({ ...a, sugeridas: null });
    }
  }
  return resultado;
}

const horasPlanGlobal = new Set(Object.values(PLAN_BT).flatMap((p) => Object.keys(p).map(simple)));
