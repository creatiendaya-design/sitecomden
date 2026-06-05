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

interface OrderDeliveredEmailProps {
  orderNumber: string;
  customerName: string;
  viewOrderLink: string;
  siteSettings?: EmailSiteSettings;
}

export default function OrderDeliveredEmail({
  orderNumber,
  customerName,
  viewOrderLink,
  siteSettings,
}: OrderDeliveredEmailProps) {
  const accent = siteSettings?.primaryColor || "#16a34a";

  return (
    <EmailLayout
      preview={`Tu orden ${orderNumber} fue entregada`}
      accent={accent}
      settings={siteSettings}
    >
      <EmailHeroIcon>🎉</EmailHeroIcon>
      <EmailText style={{ textAlign: "center", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        ¡Orden entregada!
      </EmailText>
      <EmailText>Hola {customerName},</EmailText>
      <EmailText>
        <strong>¡Tu pedido ha sido entregado exitosamente!</strong>
      </EmailText>

      <OrderNumberBadge orderNumber={orderNumber} accent={accent} />

      <EmailPanel style={{ textAlign: "center", backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
        <Text style={{ margin: 0, fontSize: "15px", color: "#15803d" }}>
          Esperamos que disfrutes tu compra. Tu satisfacción es muy importante para nosotros.
        </Text>
      </EmailPanel>

      <EmailText>
        Si tienes algún problema con tu pedido o no estás satisfecho con algún producto, por
        favor contáctanos dentro de los próximos 7 días.
      </EmailText>

      <EmailButton href={viewOrderLink} accent={accent}>
        Ver detalles de la orden
      </EmailButton>

      <EmailText muted style={{ marginTop: "24px", marginBottom: 0 }}>
        ¿Te gustó tu experiencia? Nos encantaría que dejes una reseña.
      </EmailText>
    </EmailLayout>
  );
}
