"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clienteNavegador } from "@/lib/supabase/client";

const campo = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-marca";

export default function FormularioNuevaClave({ url, clave }: { url: string; clave: string }) {
  const router = useRouter();
  const [listo, setListo] = useState<"verificando" | "ok" | "invalido">("verificando");
  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const supabase = clienteNavegador(url, clave);
    const codigo = new URLSearchParams(window.location.search).get("code");
    (async () => {
      if (codigo) {
        const { error } = await supabase.auth.exchangeCodeForSession(codigo);
        if (error) {
          const { data } = await supabase.auth.getSession();
          setListo(data.session ? "ok" : "invalido");
          return;
        }
      }
      const { data } = await supabase.auth.getSession();
      setListo(data.session ? "ok" : "invalido");
    })();
  }, [url, clave]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (c1.length < 8) return setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 8 caracteres." });
    if (c1 !== c2) return setMensaje({ tipo: "error", texto: "Las dos contraseñas no coinciden." });
    setCargando(true);
    const { error } = await clienteNavegador(url, clave).auth.updateUser({ password: c1 });
    setCargando(false);
    if (error) setMensaje({ tipo: "error", texto: "No se pudo cambiar la contraseña: " + error.message });
    else {
      setMensaje({ tipo: "ok", texto: "Contraseña actualizada. Entrando a tu panel…" });
      setTimeout(() => router.push("/panel"), 1200);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-marca">Nueva contraseña</h1>
      {listo === "verificando" && <p className="mt-4 text-slate-600">Verificando el enlace…</p>}
      {listo === "invalido" && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          El enlace no es válido o ya venció. Vuelve a pedirlo desde
          {" "}<a href="/ingresar" className="font-medium underline">Ingresar → ¿Olvidaste tu contraseña?</a>,
          y ábrelo en este mismo navegador.
        </div>
      )}
      {listo === "ok" && (
        <form onSubmit={guardar} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <input required type="password" autoComplete="new-password" className={campo} placeholder="Nueva contraseña (mínimo 8 caracteres)" value={c1} onChange={(e) => setC1(e.target.value)} />
          <input required type="password" autoComplete="new-password" className={campo} placeholder="Repite la nueva contraseña" value={c2} onChange={(e) => setC2(e.target.value)} />
          {mensaje && (
            <p className={`rounded-lg px-3 py-2 text-sm ${mensaje.tipo === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{mensaje.texto}</p>
          )}
          <button disabled={cargando} className="rounded-lg bg-marca px-4 py-2.5 font-medium text-white hover:bg-marca-oscuro disabled:opacity-60">
            {cargando ? "Guardando…" : "Guardar nueva contraseña"}
          </button>
        </form>
      )}
    </main>
  );
}
