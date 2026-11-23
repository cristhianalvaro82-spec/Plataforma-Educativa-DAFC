"use client";

import { useEffect } from "react";
import { clienteNavegador } from "@/lib/supabase/client";
import { debeCerrarSesion } from "@/lib/recordar";

export default function ControlSesion({ url, clave }: { url: string; clave: string }) {
  useEffect(() => {
    if (debeCerrarSesion()) {
      clienteNavegador(url, clave).auth.signOut().then(() => window.location.replace("/ingresar"));
    }
  }, [url, clave]);
  return null;
}
