import * as React from "react";
import {
  EmailLayout,
  EmailText,
  EmailHeroIcon,
  OrderNumberBadge,
  EmailButton,
  EmailPanel,
  Text,
  type EmailSiteSettings,
} from "./_components/EmailLayout";
import { formatPeruDateWith } from "@/lib/format-date";

interface OrderShippedEmailProps {
  orderNumber: string;
  customerName: string;
  trackingNumber?: string;
  shippingCourier?: string;
  estimatedDelivery?: string;
  viewOrderLink: string;
  siteSettings?: EmailSiteSettings;
}

export default function OrderShippedEmail({
  orderNumber,
  customerName,
  trackingNumber,
  shippingCourier,
  estimatedDelivery,
  viewOrderLink,
  siteSettings,
}: OrderShippedEmailProps) {
  const accent = siteSettings?.primaryColor || "#2563eb";

  return (
    <EmailLayout
      preview={`Tu orden ${orderNumber} está en camino`}
      accent={accent}
      settings={siteSettings}
    >
      <EmailHeroIcon>📦</EmailHeroIcon>
      <EmailText style={{ textAlign: "center", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        ¡Tu orden está en camino!
      </EmailText>
      <EmailText>Hola {customerName},</EmailText>
      <EmailText>
        ¡Buenas noticias! Tu pedido ha sido enviado y está en camino a tu dirección.
      </EmailText>

      <OrderNumberBadge orderNumber={orderNumber} accent={accent} />

      {trackingNumber ? (
        <EmailPanel style={{ textAlign: "center", backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}>
          <Text style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#1e40af" }}>
            NÚMERO DE TRACKING
          </Text>
          <Text
            style={{
              margin: "6px 0 0",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "2px",
              color: "#1e40af",
            }}
          >
            {trackingNumber}
          </Text>
          {shippingCourier ? (
            <Text style={{ margin: "8px 0 0", fontSize: "14px", color: "#1e40af" }}>
              Courier: {shippingCourier}
            </Text>
          ) : null}
        </EmailPanel>
      ) : null}

      {estimatedDelivery ? (
        <EmailPanel>
          <Text style={{ margin: 0, fontSize: "14px" }}>
            <strong>Fecha estimada de entrega:</strong>
            <br />
            {formatPeruDateWith(estimatedDelivery, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </EmailPanel>
      ) : null}

      <EmailText>
        Puedes rastrear tu paquete usando el número de tracking en el sitio web del courier
        {shippingCourier ? ` (${shippingCourier})` : ""}.
      </EmailText>

      <EmailButton href={viewOrderLink} accent={accent}>
        Ver detalles de la orden
      </EmailButton>

      <EmailText muted style={{ marginTop: "24px", marginBottom: 0 }}>
        Si tienes alguna pregunta sobre tu envío, no dudes en contactarnos.
      </EmailText>
    </EmailLayout>
  );
}
