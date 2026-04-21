"use server";

import { Resend } from "resend";
import { z } from "zod";
import { getSiteSettings } from "@/lib/site-settings";
import { escapeHtml } from "@/lib/sanitize";

const resend = new Resend(process.env.RESEND_API_KEY);

const contactSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().check(
    z.email("Por favor ingresa un email válido"),
  ),
  phone: z.string().max(20).optional(),
  subject: z.string().min(2, "El asunto es obligatorio").max(200),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres").max(2000),
});

export async function sendContactEmail(formData: FormData) {
  try {
    const raw = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: firstError.message };
    }

    const { name, email, phone, subject, message } = parsed.data;

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = phone ? escapeHtml(phone) : null;
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    const settings = await getSiteSettings();
    const safeSiteName = escapeHtml(settings.site_name);

    await resend.emails.send({
      from: `${settings.site_name} <${process.env.RESEND_FROM_EMAIL}>`,
      to: settings.contact_email || process.env.RESEND_FROM_EMAIL!,
      replyTo: email,
      subject: `Nuevo mensaje de contacto: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                Nuevo Mensaje de Contacto
              </h2>

              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;">
                  <strong>Nombre:</strong> ${safeName}
                </p>
                <p style="margin: 0 0 10px 0;">
                  <strong>Email:</strong> <a href="mailto:${safeEmail}" style="color: #2563eb;">${safeEmail}</a>
                </p>
                ${safePhone ? `<p style="margin: 0 0 10px 0;"><strong>Teléfono:</strong> ${safePhone}</p>` : ""}
                <p style="margin: 0 0 10px 0;">
                  <strong>Asunto:</strong> ${safeSubject}
                </p>
              </div>

              <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #374151;">Mensaje:</h3>
                <p style="white-space: pre-wrap; margin: 0;">${safeMessage}</p>
              </div>

              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                <p>Este mensaje fue enviado desde el formulario de contacto de ${safeSiteName}</p>
                <p style="margin: 5px 0 0 0;">Responde directamente a este email para contactar al cliente</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    await resend.emails.send({
      from: `${settings.site_name} <${process.env.RESEND_FROM_EMAIL}>`,
      to: email,
      subject: `Hemos recibido tu mensaje - ${settings.site_name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                Gracias por contactarnos
              </h2>

              <p>Hola ${safeName},</p>

              <p>Hemos recibido tu mensaje y te responderemos lo antes posible. Generalmente respondemos en un plazo de 24-48 horas durante días laborables.</p>

              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Tu mensaje:</h3>
                <p style="margin: 0 0 10px 0;"><strong>Asunto:</strong> ${safeSubject}</p>
                <p style="white-space: pre-wrap; margin: 0; color: #6b7280;">${safeMessage}</p>
              </div>

              <p>Si tu consulta es urgente, también puedes contactarnos a través de:</p>
              <ul style="color: #6b7280;">
                ${settings.contact_phone ? `<li><strong>Teléfono:</strong> ${escapeHtml(settings.contact_phone)}</li>` : ""}
                ${settings.contact_email ? `<li><strong>Email:</strong> ${escapeHtml(settings.contact_email)}</li>` : ""}
              </ul>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                <p><strong>${safeSiteName}</strong></p>
                <p style="margin: 5px 0;">Gracias por tu preferencia</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending contact email:", error);
    return {
      success: false,
      error: "Error al enviar el mensaje. Por favor, intenta de nuevo.",
    };
  }
}
