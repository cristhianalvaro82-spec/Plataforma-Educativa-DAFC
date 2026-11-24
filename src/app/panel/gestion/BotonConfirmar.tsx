"use client";

import { useState } from "react";

/** Botón de dos pasos: primero pregunta, luego confirma (sin ventanas emergentes). */
export default function BotonConfirmar({ pregunta, children }: { pregunta: string; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-sm text-rojo hover:underline">
        {children}
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-700">{pregunta}</span>
      <button type="submit" className="rounded-lg bg-rojo px-3 py-1.5 text-white hover:opacity-90">Sí, confirmar</button>
      <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100">Cancelar</button>
    </span>
  );
}
