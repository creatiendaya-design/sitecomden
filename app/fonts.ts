/**
 * Curated font loading (typography picker — Fase 1).
 *
 * Every font an admin can pick from the customizer's curated list is declared
 * here with `next/font/google`, which self-hosts the woff2 under `/_next`
 * (covered by the existing `font-src 'self'` CSP) and exposes each as a CSS
 * variable `--font-<id>`. The ids MUST match `lib/fonts/catalog.ts`.
 *
 * Perf: only the three brand defaults (Rubik / Nunito Sans / Geist Mono) keep
 * `preload: true`. Every other curated font is `preload: false`, so the browser
 * only downloads it when the active theme's tokens actually reference its
 * variable — selecting one font doesn't ship twenty.
 *
 * `next/font` requires statically-analyzable literal calls at module scope, so
 * each font is declared explicitly (no loops/maps).
 */
import {
  Rubik,
  Nunito_Sans,
  Geist_Mono,
  Inter,
  Poppins,
  Montserrat,
  Roboto,
  Open_Sans,
  Lato,
  Work_Sans,
  DM_Sans,
  Manrope,
  Playfair_Display,
  Lora,
  Merriweather,
  Cormorant_Garamond,
  EB_Garamond,
  Bebas_Neue,
  Oswald,
  Archivo,
  Sora,
  Space_Grotesk,
} from "next/font/google"

// ── Brand defaults (preloaded — these are the storefront's fallback chain) ──
const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"] })
const nunitoSans = Nunito_Sans({ variable: "--font-nunito-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

// ── Curated sans (lazy — only fetched when a theme uses them) ──
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "700"] })
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"] })
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "700"] })
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })

// ── Curated serif ──
const playfairDisplay = Playfair_Display({ variable: "--font-playfair-display", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"] })
const cormorantGaramond = Cormorant_Garamond({ variable: "--font-cormorant-garamond", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const ebGaramond = EB_Garamond({ variable: "--font-eb-garamond", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })

// ── Curated display ──
const bebasNeue = Bebas_Neue({ variable: "--font-bebas-neue", subsets: ["latin"], display: "swap", preload: false, weight: ["400"] })
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"] })

/**
 * Space-separated list of every curated font's `.variable` className. Spread
 * onto the root `<body>` so all `--font-*` custom properties resolve anywhere
 * (storefront + admin). The woff2 stays lazy thanks to `preload: false`.
 */
export const fontVariables = [
  rubik.variable,
  nunitoSans.variable,
  geistMono.variable,
  inter.variable,
  poppins.variable,
  montserrat.variable,
  roboto.variable,
  openSans.variable,
  lato.variable,
  workSans.variable,
  dmSans.variable,
  manrope.variable,
  playfairDisplay.variable,
  lora.variable,
  merriweather.variable,
  cormorantGaramond.variable,
  ebGaramond.variable,
  bebasNeue.variable,
  oswald.variable,
  archivo.variable,
  sora.variable,
  spaceGrotesk.variable,
].join(" ")
