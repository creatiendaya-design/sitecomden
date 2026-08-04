interface AmexIconProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * American Express. El logotipo oficial lleva "AMERICAN EXPRESS" completo, que
 * a 30px de ancho es ilegible; se usa el wordmark corto sobre el azul de marca,
 * como en los sets de iconos de checkout. `textLength` fija el ancho para que
 * no dependa de la fuente del sistema.
 */
export default function AmexIcon({
  className = "",
  width = 38,
  height = 24,
}: AmexIconProps) {
  return (
    <svg
      viewBox="0 0 38 24"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="American Express"
    >
      <title>American Express</title>
      <rect width="38" height="24" rx="3" fill="#1F72CD" />
      <text
        x="19"
        y="15.6"
        textAnchor="middle"
        textLength="27"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="9"
        fontWeight="700"
        fill="#FFFFFF"
      >
        AMEX
      </text>
    </svg>
  );
}
