"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/client";
import { NOMBRE_SITIO, SUBTITULO_SITIO } from "@/lib/sitio";
import { marcarRecordar } from "@/lib/recordar";

const campo = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-marca";

export default function FormularioIngreso({ url, clave }: { url: string; clave: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<"ingresar" | "registro" | "recuperar">("ingresar");
  const [f, setF] = useState({ nombres: "", apellidos: "", correo: "", clave: "" });
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [recordar, setRecordar] = useState(true);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);
    const supabase = clienteNavegador(url, clave);
    if (modo === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(f.correo, {
        redirectTo: `${window.location.origin}/nueva-clave`,
      });
      setMensaje(
        error
          ? {
              tipo: "error",
              texto: /rate limit|seconds/i.test(error.message)
                ? "Se alcanzó el límite de correos por hora. Espera un rato antes de volver a intentarlo."
                : "No se pudo enviar el correo: " + error.message,
            }
          : { tipo: "ok", texto: "Si el correo está registrado, te llegará un enlace para crear una nueva contraseña. Ábrelo en este mismo navegador." },
      );
    } else if (modo === "ingresar") {
      const { error } = await supabase.auth.signInWithPassword({ email: f.correo, password: f.clave });
      if (error) setMensaje({ tipo: "error", texto: "Correo o contraseña incorrectos." });
      else {
        marcarRecordar(recordar);
        router.push("/panel");
      }
    } else {
      if (f.clave.length < 8) {
        setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 8 caracteres." });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: f.correo,
          password: f.clave,
          options: {
            data: { nombres: f.nombres, apellidos: f.apellidos },
            emailRedirectTo: `${window.location.origin}/panel`,
          },
        });
        if (error) setMensaje({ tipo: "error", texto: error.message });
        else if (data.session) router.push("/panel");
        else setMensaje({ tipo: "ok", texto: "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa." });
      }
    }
    setCargando(false);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-ue.png" alt="Logo de la institución" className="mb-3 h-28 w-auto" />
      <h1 className="text-2xl font-bold text-marca">{NOMBRE_SITIO}</h1>
      <p className="text-sm font-medium text-slate-500">{SUBTITULO_SITIO}</p>
      <p className="mt-4 text-slate-600">{modo === "ingresar" ? "Ingresa con tu cuenta" : modo === "registro" ? "Crea tu cuenta docente" : "Recupera tu contraseña"}</p>

      <form onSubmit={enviar} autoComplete="on" className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {modo === "registro" && (
          <div className="grid grid-cols-2 gap-3">
            <input required autoComplete="given-name" className={campo} placeholder="Nombres" value={f.nombres} onChange={set("nombres")} />
            <input required autoComplete="family-name" className={campo} placeholder="Apellidos" value={f.apellidos} onChange={set("apellidos")} />
          </div>
        )}
        <input required type="email" name="email" autoComplete="username" className={campo} placeholder="Correo" value={f.correo} onChange={set("correo")} />
        {modo !== "recuperar" && <input required type="password" name="password" autoComplete={modo === "ingresar" ? "current-password" : "new-password"} className={campo} placeholder="Contraseña" value={f.clave} onChange={set("clave")} />}
        {modo === "ingresar" && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} className="h-4 w-4" />
            Mantener mi sesión iniciada en este dispositivo
          </label>
        )}
        {mensaje && (
          <p className={`rounded-lg px-3 py-2 text-sm ${mensaje.tipo === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
            {mensaje.texto}
          </p>
        )}
        <button disabled={cargando} className="rounded-lg bg-marca px-4 py-2.5 font-medium text-white hover:bg-marca-oscuro disabled:opacity-60">
          {cargando ? "Un momento…" : modo === "ingresar" ? "Ingresar" : modo === "registro" ? "Crear cuenta" : "Enviar enlace al correo"}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-start gap-2 text-sm">
        {modo === "ingresar" && (
          <button onClick={() => { setModo("recuperar"); setMensaje(null); }} className="text-marca hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
        )}
        <button
          onClick={() => { setModo(modo === "registro" ? "ingresar" : modo === "ingresar" ? "registro" : "ingresar"); setMensaje(null); }}
          className="text-marca hover:underline"
        >
          {modo === "ingresar" ? "¿No tienes cuenta? Crear cuenta" : "Volver a ingresar"}
        </button>
      </div>
    </main>
  );
}
