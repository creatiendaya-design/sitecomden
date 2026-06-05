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

interface OrderCancelledEmailProps {
  orderNumber: string;
  customerName: string;
  cancellationReason?: string;
  viewOrderLink: string;
  siteSettings?: EmailSiteSettings;
}

export default function OrderCancelledEmail({
  orderNumber,
  customerName,
  cancellationReason,
  viewOrderLink,
  siteSettings,
}: OrderCancelledEmailProps) {
  const accent = siteSettings?.primaryColor || "#dc2626";

  return (
    <EmailLayout
      preview={`Tu orden ${orderNumber} fue cancelada`}
      accent={accent}
      settings={siteSettings}
    >
      <EmailHeroIcon>❌</EmailHeroIcon>
      <EmailText style={{ textAlign: "center", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        Orden cancelada
      </EmailText>
      <EmailText>Hola {customerName},</EmailText>
      <EmailText>Te informamos que tu orden ha sido cancelada.</EmailText>

      <OrderNumberBadge orderNumber={orderNumber} accent={accent} />

      {cancellationReason ? (
        <EmailPanel style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
          <Text style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#991b1b" }}>
            Motivo de cancelación
          </Text>
          <Text style={{ margin: "4px 0 0", fontSize: "14px", color: "#991b1b" }}>
            {cancellationReason}
          </Text>
        </EmailPanel>
      ) : null}

      <EmailText>
        Si realizaste algún pago, el reembolso será procesado en los próximos 5-7 días hábiles
        dependiendo de tu método de pago.
      </EmailText>

      <EmailButton href={viewOrderLink} accent={accent}>
        Ver detalles de la orden
      </EmailButton>

      <EmailText muted style={{ marginTop: "24px", marginBottom: 0 }}>
        Si tienes alguna pregunta sobre esta cancelación, no dudes en contactarnos.
      </EmailText>
    </EmailLayout>
  );
}
