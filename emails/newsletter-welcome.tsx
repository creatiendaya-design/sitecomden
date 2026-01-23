import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface NewsletterWelcomeEmailProps {
  name?: string;
  email: string;
  couponCode?: string;  // ← Esta es la prop (string)
  unsubscribeUrl: string;
}

export const NewsletterWelcomeEmail = ({
  name,
  email,
  couponCode,  // ← Variable del cupón
  unsubscribeUrl,
}: NewsletterWelcomeEmailProps) => {
  const previewText = couponCode
    ? `¡Bienvenido! Aquí está tu cupón de 10% de descuento: ${couponCode}`
    : "¡Bienvenido a nuestra comunidad!";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header con logo */}
          <Section style={header}>
            <Heading style={h1}>ShopGood Perú</Heading>
            <Text style={tagline}>Tu tienda de confianza</Text>
          </Section>

          {/* Contenido principal */}
          <Section style={content}>
            <Heading style={h2}>
              {name ? `¡Hola ${name}!` : "¡Hola!"}
            </Heading>

            <Text style={text}>
              ¡Gracias por suscribirte a nuestro newsletter! Estamos emocionados
              de tenerte en nuestra comunidad.
            </Text>

            <Text style={text}>
              A partir de ahora recibirás en tu bandeja de entrada:
            </Text>

            <ul style={list}>
              <li style={listItem}>🎁 Ofertas exclusivas para suscriptores</li>
              <li style={listItem}>🆕 Nuevos productos antes que nadie</li>
              <li style={listItem}>💡 Consejos y guías de decoración</li>
              <li style={listItem}>🎉 Sorteos y concursos especiales</li>
            </ul>

            {/* Cupón de descuento */}
            {couponCode && (
              <Section style={couponSection}>
                <Text style={couponTitle}>
                  🎊 ¡Regalo de Bienvenida! 🎊
                </Text>
                <Text style={text}>
                  Como agradecimiento por unirte, aquí tienes un cupón de{" "}
                  <strong>10% de descuento</strong> en tu primera compra:
                </Text>
                <Section style={couponBox}>
                  {/* ⭐ FIX: Cambié el nombre del estilo a couponCodeStyle */}
                  <Text style={couponCodeStyle}>{couponCode}</Text>
                </Section>
                <Text style={couponNote}>
                  * Válido para compras mayores a S/. 100
                  <br />
                  * Válido por 30 días
                </Text>
                <Button style={button} href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://shopgood.pe'}/productos`}>
                  Explorar Productos
                </Button>
              </Section>
            )}

            <Text style={text}>
              Si tienes alguna pregunta, no dudes en contactarnos. ¡Estamos aquí
              para ayudarte!
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Recibiste este email porque te suscribiste al newsletter de
              ShopGood Perú.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={footerLink}>
                Cancelar suscripción
              </Link>
            </Text>
            <Text style={footerText}>
              ShopGood Perú © {new Date().getFullYear()}
              <br />
              Lima, Perú
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

NewsletterWelcomeEmail.PreviewProps = {
  name: "Juan Pérez",
  email: "juan@example.com",
  couponCode: "BIENVENIDO10",
  unsubscribeUrl: "https://shopgood.pe/newsletter/cancelar",
} as NewsletterWelcomeEmailProps;

export default NewsletterWelcomeEmail;

// Estilos
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 24px",
  textAlign: "center" as const,
  backgroundColor: "#0070f3",
  color: "#ffffff",
};

const h1 = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
};

const tagline = {
  color: "#ffffff",
  fontSize: "14px",
  margin: "8px 0 0",
  opacity: "0.9",
};

const content = {
  padding: "0 24px",
};

const h2 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "32px 0 16px",
};

const text = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const list = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "28px",
  margin: "16px 0",
  paddingLeft: "20px",
};

const listItem = {
  margin: "8px 0",
};

const couponSection = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  textAlign: "center" as const,
};

const couponTitle = {
  color: "#0070f3",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const couponBox = {
  margin: "24px 0",
  padding: "16px",
  backgroundColor: "#ffffff",
  border: "2px dashed #0070f3",
  borderRadius: "8px",
};

// ⭐ FIX: Renombrado de "couponCode" a "couponCodeStyle" para evitar conflicto
const couponCodeStyle = {
  color: "#0070f3",
  fontSize: "28px",
  fontWeight: "bold",
  letterSpacing: "2px",
  margin: "0",
  fontFamily: "monospace",
};

const couponNote = {
  color: "#666666",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "16px 0 24px",
};

const button = {
  backgroundColor: "#0070f3",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "16px auto",
};

const footer = {
  padding: "24px",
  textAlign: "center" as const,
  borderTop: "1px solid #e6e6e6",
  marginTop: "32px",
};

const footerText = {
  color: "#999999",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "8px 0",
};

const footerLink = {
  color: "#0070f3",
  textDecoration: "underline",
};