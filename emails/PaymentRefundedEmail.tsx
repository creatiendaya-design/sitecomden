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

interface PaymentRefundedEmailProps {
  orderNumber: string;
  customerName: string;
  refundAmount: number;
  refundReason?: string;
  viewOrderLink: string;
  siteSettings?: EmailSiteSettings;
}

export default function PaymentRefundedEmail({
  orderNumber,
  customerName,
  refundAmount,
  refundReason,
  viewOrderLink,
  siteSettings,
}: PaymentRefundedEmailProps) {
  const accent = siteSettings?.primaryColor || "#4f46e5";

  return (
    <EmailLayout
      preview={`Reembolso procesado de tu orden ${orderNumber}`}
      accent={accent}
      settings={siteSettings}
    >
      <EmailHeroIcon>💰</EmailHeroIcon>
      <EmailText style={{ textAlign: "center", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        Reembolso procesado
      </EmailText>
      <EmailText>Hola {customerName},</EmailText>
      <EmailText>Te informamos que hemos procesado el reembolso de tu orden.</EmailText>

      <OrderNumberBadge orderNumber={orderNumber} accent={accent} />

      <EmailPanel style={{ textAlign: "center", backgroundColor: "#eef2ff", borderColor: "#c7d2fe" }}>
        <Text style={{ margin: 0, fontSize: "14px", color: "#3730a3" }}>Monto reembolsado</Text>
        <Text style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: 700, color: "#3730a3" }}>
          S/ {refundAmount.toFixed(2)}
        </Text>
      </EmailPanel>

      {refundReason ? (
        <EmailPanel>
          <Text style={{ margin: 0, fontSize: "14px" }}>
            <strong>Motivo:</strong> {refundReason}
          </Text>
        </EmailPanel>
      ) : null}

      <EmailText>
        El reembolso será acreditado en los próximos <strong>5-7 días hábiles</strong>,
        dependiendo de tu banco o método de pago original.
      </EmailText>

      <EmailButton href={viewOrderLink} accent={accent}>
        Ver detalles de la orden
      </EmailButton>

      <EmailText muted style={{ marginTop: "24px", marginBottom: 0 }}>
        Lamentamos los inconvenientes. Si tienes alguna pregunta, no dudes en contactarnos.
      </EmailText>
    </EmailLayout>
  );
}
