import { describe, it, expect } from "vitest"
import {
  resolveColorSchemes,
  findColorScheme,
  generateSchemeId,
  schemeToCssLines,
  colorSchemeFromTokens,
  type ColorSchemeArray,
} from "./color-schemes"
import { DEFAULT_THEME_TOKENS } from "./tokens"

describe("colorSchemeFromTokens", () => {
  it("merges custom token colors over defaults", () => {
    const scheme = colorSchemeFromTokens({
      colors: { primary: "#ff0000" },
    })
    expect(scheme.id).toBe("default")
    expect(scheme.colors.primary).toBe("#ff0000")
    expect(scheme.colors.bg).toBe(DEFAULT_THEME_TOKENS.colors.bg)
  })

  it("returns full defaults when tokens are null", () => {
    const scheme = colorSchemeFromTokens(null)
    expect(scheme.colors).toEqual(DEFAULT_THEME_TOKENS.colors)
  })
})

describe("resolveColorSchemes", () => {
  it("returns synthetic fallback when raw is empty", () => {
    const schemes = resolveColorSchemes([], null)
    expect(schemes).toHaveLength(1)
    expect(schemes[0].id).toBe("default")
  })

  it("returns synthetic fallback when raw is not an array", () => {
    const schemes = resolveColorSchemes(null, null)
    expect(schemes).toHaveLength(1)
    expect(schemes[0].id).toBe("default")
  })

  it("normalizes a partial scheme by filling missing fields", () => {
    const raw = [{ id: "dark", name: "Dark", colors: { bg: "#000" } }]
    const [scheme] = resolveColorSchemes(raw, null)
    expect(scheme.id).toBe("dark")
    expect(scheme.name).toBe("Dark")
    expect(scheme.colors.bg).toBe("#000")
    expect(scheme.colors.primary).toBe(DEFAULT_THEME_TOKENS.colors.primary)
  })

  it("synthesizes id and name when missing", () => {
    const raw = [{ colors: {} }, { colors: {} }]
    const schemes = resolveColorSchemes(raw, null)
    expect(schemes[0].id).toBe("scheme-1")
    expect(schemes[0].name).toBe("Esquema 1")
    expect(schemes[1].id).toBe("scheme-2")
    expect(schemes[1].name).toBe("Esquema 2")
  })
})

describe("findColorScheme", () => {
  const schemes: ColorSchemeArray = [
    { id: "light", name: "Light", colors: DEFAULT_THEME_TOKENS.colors },
    { id: "dark", name: "Dark", colors: DEFAULT_THEME_TOKENS.colors },
  ]

  it("returns the scheme matching the id", () => {
    expect(findColorScheme(schemes, "dark").id).toBe("dark")
  })

  it("falls back to the first scheme when id is missing", () => {
    expect(findColorScheme(schemes, "nope").id).toBe("light")
  })

  it("falls back to the first scheme when id is null", () => {
    expect(findColorScheme(schemes, null).id).toBe("light")
  })
})

describe("generateSchemeId", () => {
  it("slugifies the proposed name", () => {
    expect(generateSchemeId("Dark Mode", [])).toBe("dark-mode")
  })

  it("disambiguates against existing ids", () => {
    const existing: ColorSchemeArray = [
      { id: "dark", name: "Dark", colors: DEFAULT_THEME_TOKENS.colors },
    ]
    expect(generateSchemeId("Dark", existing)).toBe("dark-2")
  })

  it("strips diacritics-incompatible characters", () => {
    const id = generateSchemeId("Esquema Brillante!", [])
    expect(id).toBe("esquema-brillante")
  })

  it("uses a numeric fallback when name is empty", () => {
    expect(generateSchemeId("", [])).toBe("scheme-1")
  })
})

describe("schemeToCssLines", () => {
  it("emits kebab-cased CSS custom properties for each color", () => {
    const lines = schemeToCssLines({
      id: "x",
      name: "X",
      colors: DEFAULT_THEME_TOKENS.colors,
    })
    expect(lines).toContain(
      `  --theme-primary: ${DEFAULT_THEME_TOKENS.colors.primary};`,
    )
    expect(lines).toContain(
      `  --theme-primary-foreground: ${DEFAULT_THEME_TOKENS.colors.primaryForeground};`,
    )
  })
})
