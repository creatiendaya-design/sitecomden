import { resend } from "./resend";
import { getFromEmail } from "@/actions/email-settings";
import { prisma } from "@/lib/db";
import OrderConfirmationEmail from "@/emails/OrderConfirmationEmail";
import PaymentApprovedEmail from "@/emails/PaymentApprovedEmail";
import OrderShippedEmail from "@/emails/OrderShippedEmail";
import OrderDeliveredEmail from "@/emails/OrderDeliveredEmail";
import OrderCancelledEmail from "@/emails/OrderCancelledEmail";
import PaymentFailedEmail from "@/emails/PaymentFailedEmail";
import PaymentRefundedEmail from "@/emails/PaymentRefundedEmail";

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  items: Array<{
    name: string;
    variantName?: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    address: string;
    district: string;
    city: string;
    department: string;
  };
  paymentMethod: string;
  viewOrderLink: string;
}

interface ShippingData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string;
  shippingCourier?: string;
  estimatedDelivery?: string;
  viewOrderLink: string;
}

// ⭐ FIX: Cambiar el tipo de retorno para usar undefined en lugar de null
async function getSiteSettings() {
  try {
    const [siteName, siteLogo, primaryColor] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "site_name" } }),
      prisma.setting.findUnique({ where: { key: "site_logo" } }),
      prisma.setting.findUnique({ where: { key: "primary_color" } }),
    ]);

    return {
      storeName: (siteName?.value as string) || "ShopGood Perú",
      // ⭐ FIX: Convertir null a undefined
      logoUrl: ((siteLogo?.value as string) ?? undefined),
      primaryColor: (primaryColor?.value as string) || "#000000",
    };
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return {
      storeName: "ShopGood Perú",
      logoUrl: undefined,  // ⭐ FIX: usar undefined en lugar de null
      primaryColor: "#000000",
    };
  }
}

export async function sendOrderConfirmationEmail(orderData: OrderData) {
  try {
    const [fromEmail, siteSettings] = await Promise.all([
      getFromEmail(),
      getSiteSettings(),
    ]);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: orderData.customerEmail,
      subject: `Confirmación de Orden #${orderData.orderNumber}`,
      react: OrderConfirmationEmail({
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        total: orderData.total,
        items: orderData.items,
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod,
        viewOrderLink: orderData.viewOrderLink,
        siteSettings,
      }),
    });

    if (error) {
      console.error("Error sending order confirmation email:", error);
      return { success: false, error };
    }

    console.log("Order confirmation email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return { success: false, error };
  }
}

export async function sendPaymentApprovedEmail(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  total: number,
  viewOrderLink: string
) {
  try {
    const [fromEmail, siteSettings] = await Promise.all([
      getFromEmail(),
      getSiteSettings(),
    ]);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `¡Pago Confirmado! Orden #${orderNumber}`,
      react: PaymentApprovedEmail({
        orderNumber,
        customerName,
        total,
        viewOrderLink,
        siteSettings,
      }),
    });

    if (error) {
      console.error("Error sending payment approved email:", error);
      return { success: false, error };
    }

    console.log("Payment approved email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending payment approved email:", error);
    return { success: false, error };
  }
}

export async function sendPaymentFailedEmail(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  total: number,
  viewOrderLink: string,
  failureReason?: string
) {
  try {
    const [fromEmail, siteSettings] = await Promise.all([
      getFromEmail(),
      getSiteSettings(),
    ]);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `Problema con el pago - Orden #${orderNumber}`,
      react: PaymentFailedEmail({
        orderNumber,
        customerName,
        total,
        failureReason,
        viewOrderLink,
        siteSettings,
      }),
    });

    if (error) {
      console.error("Error sending payment failed email:", error);
      return { success: false, error };
    }

    console.log("Payment failed email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending payment failed email:", error);
    return { success: false, error };
  }
}

export async function sendPaymentRefundedEmail(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  refundAmount: number,
  viewOrderLink: string,
  refundReason?: string
) {
  try {
    const [fromEmail, siteSettings] = await Promise.all([
      getFromEmail(),
      getSiteSettings(),
    ]);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `Reembolso Procesado - Orden #${orderNumber}`,
      react: PaymentRefundedEmail({
        orderNumber,
        customerName,
        refundAmount,
        refundReason,
        viewOrderLink,
        siteSettings,
      }),
    });

    if (error) {
      console.error("Error sending payment refunded email:", error);
      return { success: false, error };
    }

    console.log("Payment refunded email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending payment refunded email:", error);
    return { success: false, error };
  }
}

export async function sendOrderShippedEmail(shippingData: ShippingData) {
  try {
    const [fromEmail, siteSettings] = await Promise.all([
      getFromEmail(),
      getSiteSettings(),
    ]);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: shippingData.customerEmail,
      subject: `Tu orden está en camino - #${shippingData.orderNumber}`,
      react: OrderShippedEmail({
        orderNumber: shippingData.orderNumber,
        customerName: shippingData.customerName,
        trackingNumber: shippingData.trackingNumber,
        shippingCourier: shippingData.shippingCourier,
        estimatedDelivery: shippingData.estimatedDelivery,
        viewOrderLink: shippingData.viewOrderLink,
        siteSettings,
      }),
    });

    if (error) {
      console.error("Error sending order shipped email:", error);
      return { success: false, error };
    }

    console.log("Order shipped email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Order sending order shipped email:", error);
    return { success: false, error };
  }
}

export async function sendOrderDeliveredEmail(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  viewOrderLink: string
) {
  try {
    const [fromEmail, siteSettings] = await Promise.all([
      getFromEmail(),
      getSiteSettings(),
    ]);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `¡Orden Entregada! #${orderNumber}`,
      react: OrderDeliveredEmail({
        orderNumber,
        customerName,
        viewOrderLink,
        siteSettings,
      }),
    });

    if (error) {
      console.error("Error sending order delivered email:", error);
      return { success: false, error };
    }

    console.log("Order delivered email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending order delivered email:", error);
    return { success: false, error };
  }
}

export async function sendOrderCancelledEmail(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  viewOrderLink: string,
  cancellationReason?: string
) {
  try {
    const [fromEmail, siteSettings] = await Promise.all([
      getFromEmail(),
      getSiteSettings(),
    ]);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `Orden Cancelada - #${orderNumber}`,
      react: OrderCancelledEmail({
        orderNumber,
        customerName,
        cancellationReason,
        viewOrderLink,
        siteSettings,
      }),
    });

    if (error) {
      console.error("Error sending order cancelled email:", error);
      return { success: false, error };
    }

    console.log("Order cancelled email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending order cancelled email:", error);
    return { success: false, error };
  }
}

// Función genérica para enviar emails
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const fromEmail = await getFromEmail();
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error };
    }

    console.log("Email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

// ============================================
// 📧 NEWSLETTER - Email de Bienvenida
// ============================================

/**
 * Envía email de bienvenida al suscriptor del newsletter
 * Usa el mismo sistema de settings que los emails de órdenes
 */
export async function sendNewsletterWelcomeEmail(
  email: string,
  name?: string,
  couponCode?: string
) {
  try {
    const [fromEmail, siteSettings] = await Promise.all([
      getFromEmail(),
      getSiteSettings(),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const unsubscribeUrl = `${appUrl}/newsletter/cancelar?email=${encodeURIComponent(email)}`;

    // Crear HTML del email con el mismo estilo que los emails de órdenes
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a ${siteSettings.storeName}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: ${siteSettings.primaryColor}; color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
    .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 24px; }
    .content h2 { color: #1a1a1a; font-size: 24px; margin: 0 0 16px; }
    .content p { color: #444444; font-size: 16px; line-height: 24px; margin: 16px 0; }
    .benefits { list-style: none; padding: 0; margin: 16px 0; }
    .benefits li { color: #444444; font-size: 16px; line-height: 28px; margin: 8px 0; }
    ${couponCode ? `
    .coupon-section { margin: 32px 0; padding: 24px; background-color: #f8f9fa; border-radius: 8px; text-align: center; }
    .coupon-title { color: ${siteSettings.primaryColor}; font-size: 20px; font-weight: bold; margin: 0 0 16px; }
    .coupon-box { margin: 24px 0; padding: 16px; background-color: #ffffff; border: 2px dashed ${siteSettings.primaryColor}; border-radius: 8px; }
    .coupon-code { color: ${siteSettings.primaryColor}; font-size: 28px; font-weight: bold; letter-spacing: 2px; margin: 0; font-family: monospace; }
    .coupon-note { color: #666666; font-size: 13px; line-height: 20px; margin: 16px 0 24px; }
    .button { display: inline-block; background-color: ${siteSettings.primaryColor}; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0; }
    ` : ''}
    .footer { padding: 24px; text-align: center; border-top: 1px solid #e6e6e6; margin-top: 32px; }
    .footer p { color: #999999; font-size: 13px; line-height: 20px; margin: 8px 0; }
    .footer a { color: ${siteSettings.primaryColor}; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${siteSettings.logoUrl ? `<img src="${siteSettings.logoUrl}" alt="${siteSettings.storeName}" style="max-width: 150px; margin-bottom: 16px;">` : ''}
      <h1>${siteSettings.storeName}</h1>
      <p>Tu tienda de confianza</p>
    </div>

    <!-- Contenido -->
    <div class="content">
      <h2>${name ? `¡Hola ${name}!` : '¡Hola!'}</h2>
      
      <p>¡Gracias por suscribirte a nuestro newsletter! Estamos emocionados de tenerte en nuestra comunidad.</p>
      
      <p>A partir de ahora recibirás en tu bandeja de entrada:</p>
      
      <ul class="benefits">
        <li>🎁 Ofertas exclusivas para suscriptores</li>
        <li>🆕 Nuevos productos antes que nadie</li>
        <li>💡 Consejos y guías útiles</li>
        <li>🎉 Sorteos y concursos especiales</li>
      </ul>

      ${couponCode ? `
      <!-- Cupón -->
      <div class="coupon-section">
        <p class="coupon-title">🎊 ¡Regalo de Bienvenida! 🎊</p>
        <p style="color: #444444; font-size: 16px;">
          Como agradecimiento por unirte, aquí tienes un cupón de <strong>10% de descuento</strong> en tu primera compra:
        </p>
        <div class="coupon-box">
          <p class="coupon-code">${couponCode}</p>
        </div>
        <p class="coupon-note">
          * Válido para compras mayores a S/. 100<br>
          * Válido por 30 días
        </p>
        <a href="${appUrl}/productos" class="button">Explorar Productos</a>
      </div>
      ` : ''}

      <p>Si tienes alguna pregunta, no dudes en contactarnos. ¡Estamos aquí para ayudarte!</p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Recibiste este email porque te suscribiste al newsletter de ${siteSettings.storeName}.</p>
      <p><a href="${unsubscribeUrl}">Cancelar suscripción</a></p>
      <p>
        ${siteSettings.storeName} © ${new Date().getFullYear()}<br>
        Lima, Perú
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: couponCode 
        ? `¡Bienvenido! Aquí está tu cupón de 10% 🎁`
        : "¡Bienvenido a nuestra comunidad!",
      html: emailHtml,
    });

    if (error) {
      console.error("Error sending newsletter welcome email:", error);
      return { success: false, error };
    }

    console.log("Newsletter welcome email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error sending newsletter welcome email:", error);
    return { success: false, error };
  }
}