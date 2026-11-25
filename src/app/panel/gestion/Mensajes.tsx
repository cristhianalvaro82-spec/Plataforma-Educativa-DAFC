import NavGestion from "./NavGestion";

export default function Mensajes({ ok, error }: { ok?: string; error?: string }) {
  return (
    <>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {ok && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{ok}</p>}
    </>
  );
}

export function Cabecera({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <>
      <NavGestion />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-slate-600">{texto}</p>
    </>
  );
}

export const entrada = "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
export const botonPrincipal = "rounded-lg bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca-oscuro";
export const botonSecundario = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100";
export const tarjeta = "mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
/** Campo "Seleccionar archivo" con aspecto de botón que cambia de color al pasar el mouse. */
export const archivo = "text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-2 file:border-dashed file:border-marca-200 file:bg-marca-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-marca hover:file:border-marca hover:file:bg-marca hover:file:text-white";
