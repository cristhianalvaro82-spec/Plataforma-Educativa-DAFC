import { leerConfigSupabase } from "@/lib/supabase/config";
import FormularioNuevaClave from "./FormularioNuevaClave";

export const dynamic = "force-dynamic";

export default function NuevaClavePage() {
  const { url, key } = leerConfigSupabase();
  return <FormularioNuevaClave url={url} clave={key} />;
}
