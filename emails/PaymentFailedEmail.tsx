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

interface PaymentFailedEmailProps {
  orderNumber: string;
  customerName: string;
  total: number;
  failureReason?: string;
  viewOrderLink: string;
  siteSettings?: EmailSiteSettings;
}

export default function PaymentFailedEmail({
  orderNumber,
  customerName,
  total,
  failureReason,
  viewOrderLink,
  siteSettings,
}: PaymentFailedEmailProps) {
  const accent = siteSettings?.primaryColor || "#d97706";

  return (
    <EmailLayout
      preview={`Problema con el pago de tu orden ${orderNumber}`}
      accent={accent}
      settings={siteSettings}
    >
      <EmailHeroIcon>⚠️</EmailHeroIcon>
      <EmailText style={{ textAlign: "center", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        Problema con el pago
      </EmailText>
      <EmailText>Hola {customerName},</EmailText>
      <EmailText>Lamentablemente, no pudimos procesar el pago de tu orden.</EmailText>

      <OrderNumberBadge orderNumber={orderNumber} accent={accent} />

      <EmailPanel style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
        <Text style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#92400e" }}>
          Monto: S/ {total.toFixed(2)}
        </Text>
        {failureReason ? (
          <Text style={{ margin: "6px 0 0", fontSize: "14px", color: "#92400e" }}>
            Motivo: {failureReason}
          </Text>
        ) : null}
      </EmailPanel>

      <EmailText style={{ marginBottom: "8px" }}>
        <strong>¿Qué puedes hacer?</strong>
      </EmailText>
      <ul style={{ margin: "0 0 16px", paddingLeft: "20px", lineHeight: 1.8, color: "#1f2430", fontSize: "15px" }}>
        <li>Verifica que tu tarjeta tenga fondos suficientes</li>
        <li>Confirma que los datos de pago sean correctos</li>
        <li>Intenta con otro método de pago</li>
        <li>Contacta a tu banco si el problema persiste</li>
      </ul>

      <EmailButton href={viewOrderLink} accent={accent}>
        Reintentar pago
      </EmailButton>

      <EmailText muted style={{ marginTop: "24px", marginBottom: 0 }}>
        Si necesitas ayuda, no dudes en contactarnos. Estamos aquí para ayudarte.
      </EmailText>
    </EmailLayout>
  );
}
