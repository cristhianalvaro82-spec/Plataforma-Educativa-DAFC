/** Un teléfono "de relleno" (0000, 000-000…) se trata como vacío. */
export function telefonoValido(t?: string | null) {
  const digitos = (t ?? "").replace(/\D/g, "");
  return digitos.length >= 6 && /[1-9]/.test(digitos) ? (t ?? "").trim() : "";
}
