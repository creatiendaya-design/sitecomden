// lib/customizer/default-fonts.ts
import type { FontDef, FontCategory } from "./types";

export const DEFAULT_FONTS: FontDef[] = [
  // Sans-serif (16)
  { key: "Inter", family: "Inter", category: "sans-serif", popular: true },
  { key: "Roboto", family: "Roboto", category: "sans-serif", popular: true },
  { key: "Open Sans", family: "Open Sans", category: "sans-serif", popular: true },
  { key: "Montserrat", family: "Montserrat", category: "sans-serif", popular: true },
  { key: "Poppins", family: "Poppins", category: "sans-serif", popular: true },
  { key: "Lato", family: "Lato", category: "sans-serif" },
  { key: "Raleway", family: "Raleway", category: "sans-serif" },
  { key: "Nunito", family: "Nunito", category: "sans-serif" },
  { key: "Work Sans", family: "Work Sans", category: "sans-serif" },
  { key: "Source Sans 3", family: "Source Sans 3", category: "sans-serif" },
  { key: "Manrope", family: "Manrope", category: "sans-serif" },
  { key: "Outfit", family: "Outfit", category: "sans-serif" },
  { key: "DM Sans", family: "DM Sans", category: "sans-serif" },
  { key: "Plus Jakarta Sans", family: "Plus Jakarta Sans", category: "sans-serif" },
  { key: "Mulish", family: "Mulish", category: "sans-serif" },
  { key: "Karla", family: "Karla", category: "sans-serif" },
  // Serif (12)
  { key: "Playfair Display", family: "Playfair Display", category: "serif", popular: true },
  { key: "Merriweather", family: "Merriweather", category: "serif" },
  { key: "Lora", family: "Lora", category: "serif" },
  { key: "EB Garamond", family: "EB Garamond", category: "serif" },
  { key: "Crimson Pro", family: "Crimson Pro", category: "serif" },
  { key: "Cormorant Garamond", family: "Cormorant Garamond", category: "serif" },
  { key: "PT Serif", family: "PT Serif", category: "serif" },
  { key: "Source Serif 4", family: "Source Serif 4", category: "serif" },
  { key: "Bitter", family: "Bitter", category: "serif" },
  { key: "Roboto Serif", family: "Roboto Serif", category: "serif" },
  { key: "Noto Serif", family: "Noto Serif", category: "serif" },
  { key: "Libre Baskerville", family: "Libre Baskerville", category: "serif" },
  // Display (16)
  { key: "Bebas Neue", family: "Bebas Neue", category: "display", popular: true },
  { key: "Oswald", family: "Oswald", category: "display", popular: true },
  { key: "Anton", family: "Anton", category: "display" },
  { key: "Abril Fatface", family: "Abril Fatface", category: "display" },
  { key: "Archivo Black", family: "Archivo Black", category: "display" },
  { key: "Righteous", family: "Righteous", category: "display" },
  { key: "Bungee", family: "Bungee", category: "display" },
  { key: "Permanent Marker", family: "Permanent Marker", category: "display" },
  { key: "Black Ops One", family: "Black Ops One", category: "display" },
  { key: "Faster One", family: "Faster One", category: "display" },
  { key: "Monoton", family: "Monoton", category: "display" },
  { key: "Lobster", family: "Lobster", category: "display" },
  { key: "Pacifico", family: "Pacifico", category: "display" },
  { key: "Fredoka One", family: "Fredoka One", category: "display" },
  { key: "Alfa Slab One", family: "Alfa Slab One", category: "display" },
  { key: "Russo One", family: "Russo One", category: "display" },
  // Handwriting (10)
  { key: "Caveat", family: "Caveat", category: "handwriting" },
  { key: "Dancing Script", family: "Dancing Script", category: "handwriting" },
  { key: "Great Vibes", family: "Great Vibes", category: "handwriting" },
  { key: "Sacramento", family: "Sacramento", category: "handwriting" },
  { key: "Satisfy", family: "Satisfy", category: "handwriting" },
  { key: "Kalam", family: "Kalam", category: "handwriting" },
  { key: "Indie Flower", family: "Indie Flower", category: "handwriting" },
  { key: "Shadows Into Light", family: "Shadows Into Light", category: "handwriting" },
  { key: "Homemade Apple", family: "Homemade Apple", category: "handwriting" },
  { key: "Marck Script", family: "Marck Script", category: "handwriting" },
  // Monospace (6)
  { key: "JetBrains Mono", family: "JetBrains Mono", category: "monospace" },
  { key: "Fira Code", family: "Fira Code", category: "monospace" },
  { key: "Roboto Mono", family: "Roboto Mono", category: "monospace" },
  { key: "Source Code Pro", family: "Source Code Pro", category: "monospace" },
  { key: "Space Mono", family: "Space Mono", category: "monospace" },
  { key: "IBM Plex Mono", family: "IBM Plex Mono", category: "monospace" },
];

export const POPULAR_FONT_KEYS: string[] = DEFAULT_FONTS.filter((f) => f.popular).map((f) => f.key);

export function getFontByKey(key: string): FontDef | undefined {
  return DEFAULT_FONTS.find((f) => f.key === key);
}

export function getFontsByCategory(category: FontCategory): FontDef[] {
  return DEFAULT_FONTS.filter((f) => f.category === category);
}
