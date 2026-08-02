/**
 * Generador de códigos de barras Code 128 (subset B) en SVG puro.
 *
 * Se implementa a mano en vez de agregar una dependencia (jsbarcode y
 * similares apuntan al DOM o traen canvas): la etiqueta de envío se renderiza
 * en el servidor y el SVG resultante se imprime sin JS ni recursos externos,
 * lo cual además evita chocar con la CSP del middleware.
 */

/** Patrones de ancho (barra/espacio alternados) de los 106 símbolos + STOP. */
const PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;
const QUIET_ZONE_MODULES = 10;

/** Code 128B cubre ASCII 32–126. Todo lo demás se descarta. */
function toCodeValues(text: string): number[] {
  const values: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 126) values.push(code - 32);
  }
  return values;
}

function checksum(values: readonly number[]): number {
  const weighted = values.reduce(
    (sum, value, index) => sum + value * (index + 1),
    START_B
  );
  return weighted % 103;
}

export interface Code128Options {
  /** Ancho en px del módulo más angosto. */
  moduleWidth?: number;
  /** Alto en px de las barras. */
  height?: number;
}

export interface Code128Result {
  /** Markup SVG autocontenido, listo para `dangerouslySetInnerHTML`. */
  svg: string;
  width: number;
  height: number;
}

/**
 * Devuelve el SVG de un Code 128B, o `null` si el texto no tiene caracteres
 * codificables (el llamador decide el fallback).
 */
export function renderCode128(
  text: string,
  { moduleWidth = 2, height = 60 }: Code128Options = {}
): Code128Result | null {
  const values = toCodeValues(text);
  if (values.length === 0) return null;

  const symbols = [START_B, ...values, checksum(values), STOP];
  const widths = symbols.flatMap((symbol) =>
    [...PATTERNS[symbol]].map((digit) => Number(digit))
  );

  // La norma exige una zona de silencio de al menos 10 módulos a cada lado;
  // sin ella los lectores fallan aunque el patrón sea correcto.
  const quietZone = QUIET_ZONE_MODULES * moduleWidth;

  // Los anchos alternan barra/espacio empezando por barra.
  const bars: string[] = [];
  let x = quietZone;
  widths.forEach((modules, index) => {
    const width = modules * moduleWidth;
    if (index % 2 === 0) {
      bars.push(
        `<rect x="${x}" y="0" width="${width}" height="${height}" fill="#000"/>`
      );
    }
    x += width;
  });

  const totalWidth = x + quietZone;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" ` +
    `viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" role="img" ` +
    `aria-label="Código de barras ${text}">` +
    `<rect x="0" y="0" width="${totalWidth}" height="${height}" fill="#fff"/>` +
    `${bars.join("")}</svg>`;

  return { svg, width: totalWidth, height };
}
