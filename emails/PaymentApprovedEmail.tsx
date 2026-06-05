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

interface PaymentApprovedEmailProps {
  orderNumber: string;
  customerName: string;
  total: number;
  viewOrderLink: string;
  siteSettings?: EmailSiteSettings;
}

export default function PaymentApprovedEmail({
  orderNumber,
  customerName,
  total,
  viewOrderLink,
  siteSettings,
}: PaymentApprovedEmailProps) {
  const accent = siteSettings?.primaryColor || "#16a34a";

  return (
    <EmailLayout
      preview={`Pago confirmado de tu orden ${orderNumber}`}
      accent={accent}
      settings={siteSettings}
    >
      <EmailHeroIcon>✅</EmailHeroIcon>
      <EmailText style={{ textAlign: "center", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        ¡Pago confirmado!
      </EmailText>
      <EmailText>Hola {customerName},</EmailText>
      <EmailText>
        <strong>¡Excelentes noticias!</strong> Hemos confirmado el pago de tu orden y ya
        estamos preparando tu pedido.
      </EmailText>

      <OrderNumberBadge orderNumber={orderNumber} accent={accent} />

      <EmailPanel style={{ textAlign: "center", backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
        <Text style={{ margin: 0, fontSize: "14px", color: "#15803d" }}>Monto pagado</Text>
        <Text style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: 700, color: "#15803d" }}>
          S/ {total.toFixed(2)}
        </Text>
      </EmailPanel>

      <EmailText>
        Te notificaremos cuando tu pedido sea despachado, junto con el número de tracking
        correspondiente.
      </EmailText>

      <EmailButton href={viewOrderLink} accent={accent}>
        Ver estado de mi orden
      </EmailButton>

      <EmailText muted style={{ marginTop: "24px", marginBottom: 0 }}>
        Gracias por tu compra. Si tienes alguna pregunta, no dudes en contactarnos.
      </EmailText>
    </EmailLayout>
  );
}
