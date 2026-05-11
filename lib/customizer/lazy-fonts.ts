// lib/customizer/lazy-fonts.ts
const loaded = new Set<string>();

export function loadGoogleFont(family: string): void {
  if (typeof document === "undefined") return;
  if (loaded.has(family)) return;
  loaded.add(family);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

export function preloadFonts(families: string[]): void {
  for (const f of families) loadGoogleFont(f);
}
