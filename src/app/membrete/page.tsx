import { leerConfigSupabase } from "@/lib/supabase/config";
import { institucionDelUsuario, urlLogo } from "@/lib/datos/institucion";
import FormularioMembrete, { type Inicial } from "./FormularioMembrete";

export const dynamic = "force-dynamic";

export default async function MembretePage() {
  const { url, configurado } = leerConfigSupabase();
  let inicial: Inicial | undefined;
  if (configurado) {
    const datos = await institucionDelUsuario().catch(() => null);
    const i = datos?.institucion;
    if (i) {
      const insp = datos.autoridades.find((a) => a.cargo.startsWith("Inspector"));
      inicial = {
        inst: {
          nombre: i.nombre,
          codigoAmie: i.codigo_amie ?? "",
          zona: i.zona ?? "",
          distrito: i.distrito ?? "",
          provincia: i.provincia ?? "",
          canton: i.canton ?? "",
          direccion: i.direccion ?? "",
          telefono: i.telefono ?? "",
          correo: i.correo ?? "",
          lema: i.lema ?? "",
          colorPrimario: i.color_primario ?? "#011681",
        },
        logoUrl: urlLogo(url, i.logo_path),
        firmante: insp ? { nombre: insp.nombre, titulo: insp.titulo ?? "", cargo: "Inspector General" } : undefined,
      };
    }
  }
  return <FormularioMembrete inicial={inicial} />;
}
