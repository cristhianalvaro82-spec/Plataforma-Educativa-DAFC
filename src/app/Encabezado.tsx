import Link from "next/link";
import { NOMBRE_SITIO, SUBTITULO_SITIO } from "@/lib/sitio";

/** Franja superior con el logo y los colores de la institución. */
export default function Encabezado() {
  return (
    <header className="bg-marca text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 items-center justify-center rounded-md bg-white px-1.5 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/escudo-ue.png" alt="Escudo de la institución" className="h-full w-auto" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold">{NOMBRE_SITIO}</span>
            <span className="block text-xs text-marca-100">{SUBTITULO_SITIO}</span>
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 text-sm">
          <Link href="/panel" className="hover:underline">Mi panel</Link>
        </nav>
      </div>
      <div className="flex h-1">
        <span className="flex-[5] bg-rojo" />
        <span className="flex-1 bg-dorado" />
      </div>
    </header>
  );
}
