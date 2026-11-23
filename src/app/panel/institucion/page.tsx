import Link from "next/link";
import { redirect } from "next/navigation";
import { leerConfigSupabase } from "@/lib/supabase/config";
import { institucionDelUsuario, urlLogo } from "@/lib/datos/institucion";
import FormularioInstitucion from "./FormularioInstitucion";

export const dynamic = "force-dynamic";

export default async function InstitucionPage() {
  const { url, key, configurado } = leerConfigSupabase();
  if (!configurado) redirect("/ingresar");
  const datos = await institucionDelUsuario();
  if (!datos) redirect("/ingresar");
  if (!datos.institucion) redirect("/panel");
  const esAdmin = datos.roles.includes("administrador");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/panel" className="text-sm text-blue-700 hover:underline">← Volver al panel</Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Mi institución y membrete</h1>
      <p className="mt-1 text-slate-600">
        Estos datos aparecen en el encabezado y el pie de todos los documentos Word que genera la plataforma.
      </p>
      {!esAdmin && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Solo el administrador de la institución puede modificar estos datos.
        </p>
      )}
      <FormularioInstitucion
        url={url}
        clave={key}
        institucion={datos.institucion}
        autoridades={datos.autoridades}
        logoUrl={urlLogo(url, datos.institucion.logo_path)}
        editable={esAdmin}
      />
    </main>
  );
}
