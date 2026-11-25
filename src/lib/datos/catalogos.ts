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
