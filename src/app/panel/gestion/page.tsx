import Link from "next/link";
import { contextoGestion } from "@/lib/datos/gestion";
import { Cabecera } from "./Mensajes";

export const dynamic = "force-dynamic";

const TARJETAS = [
  ["/panel/gestion/docentes", "Docentes", "Invitar, roles, nombres y estado", ["administrador"]],
  ["/panel/gestion/cursos", "Cursos y asignaturas", "Año lectivo, paralelos, tutores y materias", ["administrador", "vicerrectorado"]],
  ["/panel/gestion/distribucion", "Distribución", "Qué docente da cada asignatura", ["administrador", "vicerrectorado"]],
  ["/panel/gestion/estudiantes", "Estudiantes", "Nóminas por curso y fichas con madre, padre y representante", ["administrador", "inspeccion", "dece", "vicerrectorado", "autoridad"]],
] as const;

export default async function GestionPage() {
  const { inst } = await contextoGestion(["administrador", "inspeccion", "dece", "vicerrectorado", "autoridad"]);
  const visibles = TARJETAS.filter(([, , , roles]) => inst.roles.some((r) => (roles as readonly string[]).includes(r)));
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Cabecera titulo="Gestión" texto={`Administración de ${inst.nombre}.`} />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {visibles.map(([href, titulo, texto]) => (
          <Link key={href} href={href} className="rounded-xl border border-marca-200 bg-white p-5 shadow-sm hover:bg-marca-50">
            <span className="block font-semibold text-marca">{titulo}</span>
            <span className="mt-1 block text-sm text-slate-600">{texto}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
