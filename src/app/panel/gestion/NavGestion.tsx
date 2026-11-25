"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const SECCIONES = [
  ["/panel/gestion/docentes", "Docentes"],
  ["/panel/gestion/cursos", "Cursos y asignaturas"],
  ["/panel/gestion/distribucion", "Distribución"],
  ["/panel/gestion/estudiantes", "Estudiantes"],
] as const;

/** Menú de Gestión en forma de pestañas; resalta la sección actual. */
export default function NavGestion() {
  const ruta = usePathname();
  return (
    <nav className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-[#f8fafc]/95 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2 overflow-x-auto">
        <Link href="/panel" className="shrink-0 rounded-full px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">← Panel</Link>
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">Gestión</span>
        {SECCIONES.map(([href, nombre]) => {
          const activa = ruta.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${activa ? "bg-marca text-white" : "border border-marca-200 bg-white text-marca hover:bg-marca-50"}`}>
              {nombre}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
