"use server";

import { Resend } from "resend";
import { getSiteSettings } from "@/lib/site-settings";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;

    // Validaciones básicas
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        error: "Por favor completa todos los campos obligatorios",
      };
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Por favor ingresa un email válido",
      };
    }

    const settings = await getSiteSettings();

    // Enviar email al admin
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
                  <strong>Nombre:</strong> ${name}
                </p>
                <p style="margin: 0 0 10px 0;">
                  <strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a>
                </p>
                ${phone ? `<p style="margin: 0 0 10px 0;"><strong>Teléfono:</strong> ${phone}</p>` : ""}
                <p style="margin: 0 0 10px 0;">
                  <strong>Asunto:</strong> ${subject}
                </p>
              </div>

              <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #374151;">Mensaje:</h3>
                <p style="white-space: pre-wrap; margin: 0;">${message}</p>
              </div>

              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                <p>Este mensaje fue enviado desde el formulario de contacto de ${settings.site_name}</p>
                <p style="margin: 5px 0 0 0;">Responde directamente a este email para contactar al cliente</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // Email de confirmación al cliente
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
              
              <p>Hola ${name},</p>
              
              <p>Hemos recibido tu mensaje y te responderemos lo antes posible. Generalmente respondemos en un plazo de 24-48 horas durante días laborables.</p>

              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Tu mensaje:</h3>
                <p style="margin: 0 0 10px 0;"><strong>Asunto:</strong> ${subject}</p>
                <p style="white-space: pre-wrap; margin: 0; color: #6b7280;">${message}</p>
              </div>

              <p>Si tu consulta es urgente, también puedes contactarnos a través de:</p>
              <ul style="color: #6b7280;">
                ${settings.contact_phone ? `<li><strong>Teléfono:</strong> ${settings.contact_phone}</li>` : ""}
                ${settings.contact_email ? `<li><strong>Email:</strong> ${settings.contact_email}</li>` : ""}
              </ul>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                <p><strong>${settings.site_name}</strong></p>
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