"use client";

import { useEffect, useState } from "react";
import { clienteNavegador } from "@/lib/supabase/client";
import { NOMBRE_SITIO, SUBTITULO_SITIO } from "@/lib/sitio";
import { marcarRecordar } from "@/lib/recordar";
import CampoClave from "@/components/CampoClave";

const campo = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-marca";

export default function FormularioIngreso({ url, clave }: { url: string; clave: string }) {
  const [modo, setModo] = useState<"ingresar" | "registro" | "recuperar">("ingresar");
  const [f, setF] = useState({ nombres: "", apellidos: "", correo: "", clave: "" });
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("motivo") === "sesion")
      setMensaje({ tipo: "error", texto: "Tu sesión no se pudo abrir en el panel. Vuelve a ingresar; si se repite, avísame." });
  }, []);
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
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: f.correo.trim(), password: f.clave });
        if (error) {
          const texto = /confirm/i.test(error.message)
            ? "Tu correo aún no está confirmado. Abre el mensaje de confirmación que te llegó."
            : /invalid/i.test(error.message)
              ? "Correo o contraseña incorrectos."
              : "No se pudo ingresar: " + error.message;
          setMensaje({ tipo: "error", texto });
        } else {
          marcarRecordar(recordar);
          setMensaje({ tipo: "ok", texto: "Ingresando…" });
          // Navegación completa para que el servidor reciba la sesión recién creada.
          window.location.assign("/panel");
          return;
        }
      } catch (e) {
        setMensaje({ tipo: "error", texto: "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo." + (e instanceof Error ? " (" + e.message + ")" : "") });
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
        else if (data.session) window.location.assign("/panel");
        else setMensaje({ tipo: "ok", texto: "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa." });
      }
    }
    setCargando(false);
  }

  return (
    <main className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-10 lg:grid-cols-[1fr_420px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/docentes.png" alt="Docentes de la institución" className="hidden h-[520px] w-auto justify-self-center drop-shadow-xl lg:block" />
      <div className="mx-auto w-full max-w-md">
        {/* En celular: los docentes, más pequeños, encima del formulario */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/docentes.png" alt="" aria-hidden="true" className="mx-auto mb-2 h-56 w-auto drop-shadow-lg lg:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-ue.png" alt="Logo de la institución" className="mb-3 h-24 w-auto drop-shadow-sm lg:h-36" />
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
        {modo !== "recuperar" && <CampoClave required name="password" autoComplete={modo === "ingresar" ? "current-password" : "new-password"} className={campo} placeholder="Contraseña" value={f.clave} onChange={set("clave")} />}
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

      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        {modo === "ingresar" ? (
          <>
            <button onClick={() => { setModo("registro"); setMensaje(null); }} className="text-marca hover:underline">Crear cuenta</button>
            <span className="text-slate-300">·</span>
            <button onClick={() => { setModo("recuperar"); setMensaje(null); }} className="text-marca hover:underline">¿Olvidaste tu contraseña?</button>
          </>
        ) : (
          <button onClick={() => { setModo("ingresar"); setMensaje(null); }} className="text-marca hover:underline">← Volver a ingresar</button>
        )}
      </div>
      </div>
    </main>
  );
}
