import Link from "next/link";
import { NOMBRE_SITIO, SUBTITULO_SITIO } from "@/lib/sitio";

const modulos = [
  { nombre: "Mi institución y membrete", estado: "Disponible", href: "/panel/institucion", desc: "Datos de la unidad educativa y documentos Word con hoja membretada." },
  { nombre: "Cursos, horarios y nóminas", estado: "Fase 1", desc: "Cursos, paralelos, asignaturas, horario del docente e importación desde Excel." },
  { nombre: "Planificaciones con IA", estado: "Fase 2", desc: "Plan anual, trimestral, semanal y plan de clase en ERCA o ACC con DUA." },
  { nombre: "Asistencia y calificaciones", estado: "Fase 3", desc: "Asistencia, atrasos, escalas oficiales, supletorio y reportes." },
  { nombre: "Evaluaciones", estado: "Fase 4", desc: "Banco de preguntas, hoja impresa y cuestionario en vivo con QR." },
  { nombre: "Convivencia, DECE e Inspección", estado: "Fase 5", desc: "Casos con ruta y plazos, cartas a representantes y paneles por rol." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">{NOMBRE_SITIO}</h1>
      <p className="text-lg text-slate-500">{SUBTITULO_SITIO}</p>
      <div className="mt-4 flex gap-3">
        <Link href="/ingresar" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Ingresar</Link>
        <Link href="/panel" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">Mi panel</Link>
      </div>
      <p className="mt-4 max-w-2xl text-slate-600">
        Todo el trabajo docente e institucional en un solo lugar: planificar, evaluar, calificar, tomar asistencia y generar
        documentos con el membrete de tu unidad educativa.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((m) => {
          const tarjeta = (
            <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.href ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
                {m.estado}
              </span>
              <h2 className="mt-3 font-semibold text-slate-900">{m.nombre}</h2>
              <p className="mt-1 text-sm text-slate-600">{m.desc}</p>
            </div>
          );
          return m.href ? <Link key={m.nombre} href={m.href}>{tarjeta}</Link> : <div key={m.nombre}>{tarjeta}</div>;
        })}
      </div>
    </main>
  );
}
