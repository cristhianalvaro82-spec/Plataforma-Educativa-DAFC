/**
 * "Mantener mi sesión iniciada".
 * Marcado (por defecto): la sesión sigue abierta aunque se cierre el navegador.
 * Desmarcado (computadores compartidos): la sesión se cierra al cerrar el navegador.
 */
const CLAVE_NO_RECORDAR = "pe_no_recordar";
const CLAVE_ACTIVA = "pe_sesion_activa";

export function marcarRecordar(recordar: boolean) {
  try {
    if (recordar) localStorage.removeItem(CLAVE_NO_RECORDAR);
    else localStorage.setItem(CLAVE_NO_RECORDAR, "1");
    sessionStorage.setItem(CLAVE_ACTIVA, "1");
  } catch {}
}

/** true si la sesión debe cerrarse porque el navegador se cerró. */
export function debeCerrarSesion(): boolean {
  try {
    return localStorage.getItem(CLAVE_NO_RECORDAR) === "1" && !sessionStorage.getItem(CLAVE_ACTIVA);
  } catch {
    return false;
  }
}
