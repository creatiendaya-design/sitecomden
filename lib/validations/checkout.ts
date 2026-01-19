import { z } from "zod";

// Validación de DNI peruano (8 dígitos) - AHORA OPCIONAL
const dniSchema = z
  .string()
  .optional()
  .refine(
    (val) => !val || (val.length === 8 && /^\d{8}$/.test(val)),
    "El DNI debe tener 8 dígitos numéricos"
  );

// Validación de teléfono peruano
const phoneSchema = z
  .string()
  .min(9, "El teléfono debe tener al menos 9 dígitos")
  .regex(
    /^(\+51)?[\s]?9\d{8}$/,
    "Formato inválido. Ejemplo: +51 987654321 o 987654321"
  );

// Validación de email
const emailSchema = z
  .string()
  .email("Email inválido")
  .min(5, "Email muy corto")
  .max(100, "Email muy largo");

// Schema completo de checkout - ACTUALIZADO
export const checkoutFormSchema = z.object({
  // Información del cliente
  customerName: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre es muy largo")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El nombre solo puede contener letras"),
  
  customerEmail: emailSchema,
  
  customerPhone: phoneSchema,
  
  customerDni: dniSchema, // Ahora opcional
  
  // Dirección de envío
  address: z
    .string()
    .min(10, "La dirección debe tener al menos 10 caracteres")
    .max(200, "La dirección es muy larga"),
  
  district: z
    .string()
    .min(3, "El distrito debe tener al menos 3 caracteres")
    .max(50, "El distrito es muy largo"),
  
  city: z
    .string()
    .min(3, "La ciudad debe tener al menos 3 caracteres")
    .max(50, "La ciudad es muy larga"),
  
  department: z
    .string()
    .min(3, "El departamento debe tener al menos 3 caracteres")
    .max(50, "El departamento es muy largo"),
  
  reference: z
    .string()
    .max(200, "La referencia es muy larga")
    .optional(),

  // Ubicación (IDs y códigos) - NUEVOS CAMPOS
  departmentId: z.string().optional(),
  provinceId: z.string().optional(),
  districtCode: z.string().optional(),
  departmentName: z.string().optional(),
  provinceName: z.string().optional(),
  districtName: z.string().optional(),

  // Método de pago
  paymentMethod: z.enum(["YAPE", "PLIN", "CARD", "PAYPAL", "MERCADOPAGO"] as const),

  // Notas del cliente
  customerNotes: z
    .string()
    .max(500, "Las notas no pueden exceder 500 caracteres")
    .optional(),

  // Aceptación de términos
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: "Debes aceptar los términos y condiciones",
    }),

  // Opt-in para WhatsApp
  acceptWhatsApp: z.boolean().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

// Schema para validación de item del carrito
export const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().nullable(),
  name: z.string(),
  variantName: z.string().nullable(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  maxStock: z.number().int().positive(),
  image: z.string().nullable(),
  // ⭐ FIX: z.record() requiere 2 argumentos (key type, value type)
  options: z.record(z.string(), z.string()).nullable(),
});

export type CartItem = z.infer<typeof cartItemSchema>;