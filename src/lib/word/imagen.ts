/** Tipo y proporción (ancho/alto) de una imagen PNG o JPG, leyendo su cabecera. */
export function medirImagen(b: Uint8Array): { tipo: "png" | "jpg"; proporcion: number } | null {
  if (b[0] === 0x89 && b[1] === 0x50) {
    const v = new DataView(b.buffer, b.byteOffset);
    const w = v.getUint32(16), h = v.getUint32(20);
    return h ? { tipo: "png", proporcion: w / h } : null;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      const largo = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        const h = (b[i + 5] << 8) | b[i + 6], w = (b[i + 7] << 8) | b[i + 8];
        return h ? { tipo: "jpg", proporcion: w / h } : null;
      }
      i += 2 + largo;
    }
  }
  return null;
}
