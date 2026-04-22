import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

interface ComprobanteEmitidoProps {
  customerName: string;
  orderNumber: string;
  documentNumber: string;
  total: number;
  pdfUrl: string;
}

export default function ComprobanteEmitido({
  customerName,
  orderNumber,
  documentNumber,
  total,
  pdfUrl,
}: ComprobanteEmitidoProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu comprobante de pago {documentNumber} está listo</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Heading style={{ color: "#1a1a1a" }}>Tu comprobante está listo</Heading>
          <Text>Hola {customerName},</Text>
          <Text>
            Adjuntamos tu comprobante electrónico por tu orden <strong>#{orderNumber}</strong>.
          </Text>
          <Section
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "20px",
              margin: "20px 0",
            }}
          >
            <Text style={{ margin: 0 }}>
              <strong>Comprobante:</strong> {documentNumber}
            </Text>
            <Text style={{ margin: "8px 0 0" }}>
              <strong>Total:</strong> S/. {total.toFixed(2)}
            </Text>
          </Section>
          <Button
            href={pdfUrl}
            style={{
              backgroundColor: "#0070f3",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Descargar Comprobante PDF
          </Button>
          <Hr style={{ margin: "24px 0" }} />
          <Text style={{ color: "#666", fontSize: "13px" }}>
            Este comprobante fue emitido electrónicamente y es válido ante SUNAT.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
