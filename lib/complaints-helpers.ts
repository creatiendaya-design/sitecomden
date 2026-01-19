// lib/complaints-helpers.ts
import { FormField } from "@/types/complaints";

/**
 * Convierte un FormField de Prisma al tipo FormField esperado por el componente
 * Maneja la conversión de null a undefined y JsonValue a string[]
 */
export function prismaFieldToFormField(field: any): FormField {
  return {
    id: field.id,
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    order: field.order,
    active: field.active,
    createdAt: field.createdAt,
    updatedAt: field.updatedAt,
    // Convertir null a undefined
    section: field.section ?? undefined,
    placeholder: field.placeholder ?? undefined,
    helpText: field.helpText ?? undefined,
    minLength: field.minLength ?? undefined,
    maxLength: field.maxLength ?? undefined,
    pattern: field.pattern ?? undefined,
    width: field.width ?? undefined,
    otherLabel: field.otherLabel ?? undefined,
    // Convertir options de JsonValue a string[]
    options: field.options 
      ? Array.isArray(field.options) 
        ? (field.options as string[])
        : undefined
      : undefined,
  };
}