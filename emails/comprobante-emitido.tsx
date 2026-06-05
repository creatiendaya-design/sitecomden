import * as React from "react";
import {
  EmailLayout,
  EmailText,
  EmailSectionTitle,
  OrderNumberBadge,
  EmailButton,
  EmailPanel,
  Text,
  type EmailSiteSettings,
} from "./_components/EmailLayout";

interface ComprobanteEmitidoProps {
  customerName: string;
  orderNumber: string;
  documentNumber: string;
  total: number;
  pdfUrl: string;
  siteSettings?: EmailSiteSettings;
}

export default function ComprobanteEmitido({
  customerName,
  orderNumber,
  documentNumber,
  total,
  pdfUrl,
  siteSettings,
}: ComprobanteEmitidoProps) {
  const accent = siteSettings?.primaryColor || "#2563eb";

  return (
    <EmailLayout
      preview={`Tu comprobante ${documentNumber} está listo`}
      accent={accent}
      settings={siteSettings}
    >
      <EmailText style={{ textAlign: "center", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
        Tu comprobante está listo
      </EmailText>
      <EmailText>Hola {customerName},</EmailText>
      <EmailText>Adjuntamos tu comprobante electrónico por tu compra.</EmailText>

      <OrderNumberBadge orderNumber={orderNumber} accent={accent} />

      <EmailSectionTitle>Detalle del comprobante</EmailSectionTitle>
      <EmailPanel>
        <Text style={{ margin: 0, fontSize: "15px" }}>
          <strong>Comprobante:</strong> {documentNumber}
        </Text>
        <Text style={{ margin: "8px 0 0", fontSize: "15px" }}>
          <strong>Total:</strong> S/ {total.toFixed(2)}
        </Text>
      </EmailPanel>

      <EmailButton href={pdfUrl} accent={accent}>
        Descargar comprobante PDF
      </EmailButton>

      <EmailText muted style={{ marginTop: "24px", marginBottom: 0 }}>
        Este comprobante fue emitido electrónicamente y es válido ante SUNAT.
      </EmailText>
    </EmailLayout>
  );
}
