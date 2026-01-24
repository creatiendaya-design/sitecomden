export default function ProductPlaceholder() {
  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="400" height="400" fill="#F3F4F6" />
      <g opacity="0.3">
        <path
          d="M200 120C177.909 120 160 137.909 160 160V240C160 262.091 177.909 280 200 280C222.091 280 240 262.091 240 240V160C240 137.909 222.091 120 200 120Z"
          fill="#9CA3AF"
        />
        <circle cx="185" cy="170" r="8" fill="#F3F4F6" />
        <path
          d="M160 220L175 200L190 215L210 190L240 230V240C240 262.091 222.091 280 200 280C177.909 280 160 262.091 160 240V220Z"
          fill="#6B7280"
        />
      </g>
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#9CA3AF"
        fontSize="14"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="500"
      >
        Sin imagen
      </text>
    </svg>
  );
}