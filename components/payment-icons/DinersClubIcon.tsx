interface DinersClubIconProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Diners Club International: disco azul, anillo blanco y los dos semicírculos
 * separados por la franja vertical blanca característica de la marca.
 */
export default function DinersClubIcon({
  className = "",
  width = 24,
  height = 24,
}: DinersClubIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Diners Club"
    >
      <title>Diners Club</title>
      <circle cx="12" cy="12" r="11" fill="#0079BE" />
      <circle cx="12" cy="12" r="9" fill="#FFFFFF" />
      {/* Semicírculo izquierdo */}
      <path d="M11.1 4.5A7.5 7.5 0 0 0 11.1 19.5Z" fill="#0079BE" />
      {/* Semicírculo derecho */}
      <path d="M12.9 4.5A7.5 7.5 0 0 1 12.9 19.5Z" fill="#0079BE" />
    </svg>
  );
}
