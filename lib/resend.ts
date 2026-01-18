import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email por defecto para enviar (con nombre)
export const FROM_EMAIL = "Cartia Digital <onboarding@atencialcliente.cartiadigital.com>";

// Email del admin para notificaciones
export const ADMIN_EMAIL = "contact@cartiadigital.com";