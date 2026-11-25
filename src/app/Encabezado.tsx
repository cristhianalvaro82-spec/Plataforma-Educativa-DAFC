import Link from "next/link";
import { NOMBRE_SITIO, SUBTITULO_SITIO } from "@/lib/sitio";

/** Franja superior con el logo y los colores de la institución. */
export default function Encabezado() {
  return (
    <header className="bg-marca text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="leading-tight">
            <span className="block text-lg font-semibold">{NOMBRE_SITIO}</span>
            <span className="block text-xs text-marca-100">{SUBTITULO_SITIO}</span>
          </span>
        </Link>
        <nav className="ml-auto flex shrink-0 gap-4 whitespace-nowrap text-sm">
          <Link href="/panel" className="hover:underline">Mi panel</Link>
          <Link href="/panel/gestion" className="hover:underline">Gestión</Link>
        </nav>
      </div>
      <div className="flex h-1">
        <span className="flex-[5] bg-rojo" />
        <span className="flex-1 bg-dorado" />
      </div>
    </header>
  );
}
