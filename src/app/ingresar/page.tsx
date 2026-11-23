import { leerConfigSupabase } from "@/lib/supabase/config";
import FormularioIngreso from "./FormularioIngreso";

export const dynamic = "force-dynamic";

export default function IngresarPage() {
  const { url, key, configurado } = leerConfigSupabase();
  if (!configurado) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Inicio de sesión en configuración</h1>
        <p className="mt-2 text-slate-600">
          Falta conectar la base de datos (Supabase) en Vercel.
          {!url && " No se encontró NEXT_PUBLIC_SUPABASE_URL."}
          {!key && " No se encontró NEXT_PUBLIC_SUPABASE_ANON_KEY."}
        </p>
      </main>
    );
  }
  return <FormularioIngreso url={url} clave={key} />;
}
