import * as React from "react";
import {
  EmailLayout,
  EmailText,
  EmailSectionTitle,
  OrderNumberBadge,
  EmailButton,
  EmailPanel,
  type EmailSiteSettings,
} from "./_components/EmailLayout";
import { EmailOrderItems, type EmailOrderItem } from "./_components/OrderItems";

interface OrderConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  total: number;
  items: EmailOrderItem[];
  shippingAddress: {
    address: string;
    district: string;
    city: string;
    department: string;
  };
  paymentMethod: string;
  viewOrderLink: string;
  siteSettings?: EmailSiteSettings;
}

const PAYMENT_LABELS: Record<string, string> = {
  YAPE: "Yape",
  PLIN: "Plin",
  CARD: "Tarjeta de crédito/débito",
  PAYPAL: "PayPal",
  MERCADOPAGO: "Mercado Pago",
};

export default function OrderConfirmationEmail({
  orderNumber,
  customerName,
  total,
  items,
  shippingAddress,
  paymentMethod,
  viewOrderLink,
  siteSettings,
}: OrderConfirmationEmailProps) {
  const accent = siteSettings?.primaryColor || "#111827";
  const isManual = paymentMethod === "YAPE" || paymentMethod === "PLIN";

  return (
    <EmailLayout
      preview={`Recibimos tu orden ${orderNumber}`}
      accent={accent}
      settings={siteSettings}
    >
      <EmailText>Hola {customerName},</EmailText>
      <EmailText>
        ¡Gracias por tu compra! Hemos recibido tu orden y la estamos procesando.
      </EmailText>

      <OrderNumberBadge orderNumber={orderNumber} accent={accent} />

      <EmailSectionTitle>Resumen de tu pedido</EmailSectionTitle>
      <EmailOrderItems items={items} total={total} accent={accent} />

      <EmailSectionTitle>Dirección de envío</EmailSectionTitle>
      <EmailPanel>
        <EmailText muted style={{ margin: 0 }}>
          {shippingAddress.address}
          <br />
          {shippingAddress.district}, {shippingAddress.city}
          <br />
          {shippingAddress.department}
        </EmailText>
      </EmailPanel>

      <EmailSectionTitle>Método de pago</EmailSectionTitle>
      <EmailPanel>
        <EmailText style={{ margin: 0 }}>
          {PAYMENT_LABELS[paymentMethod] || paymentMethod}
        </EmailText>
        {isManual ? (
          <EmailText muted style={{ margin: "8px 0 0", color: "#b45309" }}>
            ⚠️ Tu pago está pendiente de verificación. Te notificaremos cuando sea confirmado.
          </EmailText>
        ) : null}
      </EmailPanel>

      <EmailButton href={viewOrderLink} accent={accent}>
        Ver estado de mi orden
      </EmailButton>

      <EmailText muted style={{ marginTop: "24px", marginBottom: 0 }}>
        Si tienes alguna pregunta sobre tu orden, no dudes en contactarnos.
      </EmailText>
    </EmailLayout>
  );
}
