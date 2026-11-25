/** Identidad visible de la plataforma (se podrá tomar de la institución más adelante). */
export const NOMBRE_SITIO = "U.E. Dr. Andrés F. Córdova";
export const SUBTITULO_SITIO = "Plataforma docente";

/**
 * Hoja membretada oficial (Zona 4, vertical) entregada por la institución.
 * El fondo es la imagen del Gobierno/Ministerio; encima van el logo y los datos de la U.E.
 */
export const MEMBRETE_OFICIAL = {
  fondo: "/hoja-membretada.png",
  lugar: "LA CONCORDIA – SANTO DOMINGO DE LOS TSÁCHILAS - ECUADOR",
  pie: [
    ["Dirección:", "La Concordia, Calle Pichincha y By pass Puerto Quito"],
    ["Código postal:", "080701 / La Concordia - Ecuador"],
    ["Teléfono:", "+593-2 2727-827"],
    ["", "www.educacion.gob.ec"],
  ] as [string, string][],
};
