export type CheckoutMode = "STANDARD" | "COD_ONLY" | "COD_AND_CART";

export interface CodFormField {
  id: "name" | "phone" | "email" | "dni" | "location" | "address" | "notes";
  label: string;
  required: boolean;
  visible: boolean;
}

export interface CodFormSettings {
  formTitle: string;
  formSubtitle?: string;
  buttonText: string;
  paymentBadge?: string;
  thankYouTitle: string;
  thankYouMessage: string;
  whatsappEnabled: boolean;
  whatsappNumber?: string;
  whatsappMessage?: string;
  fields: CodFormField[];
}

export const DEFAULT_COD_FORM_SETTINGS: CodFormSettings = {
  formTitle: "🛒 Completa tu pedido",
  formSubtitle: "Envío a todo el Perú",
  buttonText: "Confirmar pedido →",
  paymentBadge: "✅ Pagas cuando recibes el producto",
  thankYouTitle: "¡Gracias por tu pedido! 🎉",
  thankYouMessage: "Nos comunicaremos contigo en breve para coordinar la entrega.",
  whatsappEnabled: false,
  whatsappNumber: "",
  whatsappMessage:
    "Hola, hice un pedido:\nProducto: {producto}\nNombre: {nombre}\nTel: {telefono}\nDirección: {direccion}, {distrito}\nTotal: S/ {total}",
  fields: [
    { id: "name",     label: "Nombre completo",                    required: true,  visible: true  },
    { id: "phone",    label: "Teléfono / WhatsApp",                required: true,  visible: true  },
    { id: "email",    label: "Correo electrónico",                 required: false, visible: true  },
    { id: "dni",      label: "DNI",                                required: false, visible: false },
    { id: "location", label: "Departamento / Provincia / Distrito", required: true,  visible: true  },
    { id: "address",  label: "Dirección de entrega",               required: true,  visible: true  },
    { id: "notes",    label: "Notas adicionales",                  required: false, visible: false },
  ],
};
