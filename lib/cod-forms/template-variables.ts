// lib/cod-forms/template-variables.ts
// Resolves {nombre}, {telefono}, {direccion}, {distrito}, {total},
// {producto}, {pedido}, {referencia} inside any string.

export type TemplateVariables = {
  nombre?: string
  telefono?: string
  direccion?: string
  distrito?: string
  total?: string
  producto?: string
  pedido?: string
  referencia?: string
}

export function resolveTemplateVariables(
  text: string,
  vars: TemplateVariables,
): string {
  if (!text) return text
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key as keyof TemplateVariables]
    return value === undefined || value === null ? match : value
  })
}
