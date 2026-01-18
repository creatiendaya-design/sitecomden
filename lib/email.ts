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

async function getSiteSettings() {
  try {
    const [siteName, siteLogo, primaryColor] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "site_name" } }),
      prisma.setting.findUnique({ where: { key: "site_logo" } }),
      prisma.setting.findUnique({ where: { key: "primary_color" } }),
    ]);

    return {
      storeName: (siteName?.value as string) || "ShopGood Perú",
      logoUrl: (siteLogo?.value as string) || null,
      primaryColor: (primaryColor?.value as string) || "#000000",
    };
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return {
      storeName: "ShopGood Perú",
      logoUrl: null,
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
    console.error("Error sending order shipped email:", error);
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