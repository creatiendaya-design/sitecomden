import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Img,
  Hr,
  Preview,
} from "@react-email/components";

/**
 * Paleta y tipografía compartida por todas las plantillas de correo.
 * Centralizar esto evita el CSS duplicado que existía en cada template y
 * garantiza una identidad visual consistente.
 */
export const email = {
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  colors: {
    page: "#f4f4f7",
    card: "#ffffff",
    border: "#e8e8ef",
    text: "#1f2430",
    muted: "#6b7280",
    mutedLight: "#9ca3af",
    softBg: "#f7f8fa",
  },
} as const;

export interface EmailSiteSettings {
  storeName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

interface EmailLayoutProps {
  /** Texto del preheader (se muestra en la bandeja antes de abrir). */
  preview: string;
  /** Color de acento (header + botones). */
  accent?: string;
  settings?: EmailSiteSettings;
  children: React.ReactNode;
  /** Nota extra opcional en el footer (ej. enlace para cancelar suscripción). */
  footerExtra?: React.ReactNode;
}

const DEFAULT_ACCENT = "#111827";

export function EmailLayout({
  preview,
  accent,
  settings,
  children,
  footerExtra,
}: EmailLayoutProps) {
  const storeName = settings?.storeName || "ShopGood Perú";
  const logoUrl = settings?.logoUrl;
  const accentColor = accent || settings?.primaryColor || DEFAULT_ACCENT;
  const year = new Date().getFullYear();

  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: email.colors.page,
          fontFamily: email.font,
          color: email.colors.text,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "24px 12px 32px",
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: accentColor,
              borderRadius: "14px 14px 0 0",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt={storeName}
                height={44}
                style={{
                  height: "44px",
                  maxHeight: "44px",
                  width: "auto",
                  margin: "0 auto",
                  objectFit: "contain",
                }}
              />
            ) : (
              <Heading
                as="h1"
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "26px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                {storeName}
              </Heading>
            )}
          </Section>

          {/* Body card */}
          <Section
            style={{
              backgroundColor: email.colors.card,
              border: `1px solid ${email.colors.border}`,
              borderTop: "none",
              borderRadius: "0 0 14px 14px",
              padding: "32px 28px",
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ padding: "24px 16px 0", textAlign: "center" }}>
            <Text
              style={{
                margin: "0 0 6px",
                fontSize: "13px",
                color: email.colors.muted,
              }}
            >
              © {year} {storeName}. Todos los derechos reservados.
            </Text>
            {footerExtra ? (
              <Text style={{ margin: "0 0 6px", fontSize: "12px", color: email.colors.mutedLight }}>
                {footerExtra}
              </Text>
            ) : null}
            <Text style={{ margin: 0, fontSize: "12px", color: email.colors.mutedLight }}>
              Este es un correo automático, por favor no respondas a este mensaje.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Bloques reutilizables                                              */
/* ------------------------------------------------------------------ */

/** Saludo + párrafos de cuerpo con estilo consistente. */
export function EmailText({
  children,
  muted,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <Text
      style={{
        margin: "0 0 16px",
        fontSize: muted ? "14px" : "16px",
        lineHeight: 1.6,
        color: muted ? email.colors.muted : email.colors.text,
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

/** Icono grande (emoji) centrado, usado como hero en estados de orden. */
export function EmailHeroIcon({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ margin: "0 0 8px", fontSize: "56px", textAlign: "center", lineHeight: 1 }}>
      {children}
    </Text>
  );
}

/** Título de sección. */
export function EmailSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Heading
      as="h2"
      style={{
        margin: "0 0 12px",
        fontSize: "17px",
        fontWeight: 700,
        color: email.colors.text,
      }}
    >
      {children}
    </Heading>
  );
}

/** Badge con el número de orden. */
export function OrderNumberBadge({
  orderNumber,
  accent,
}: {
  orderNumber: string;
  accent: string;
}) {
  return (
    <Section style={{ textAlign: "center", margin: "0 0 24px" }}>
      <Text
        style={{
          display: "inline-block",
          margin: 0,
          padding: "8px 18px",
          backgroundColor: email.colors.softBg,
          border: `1px solid ${email.colors.border}`,
          borderRadius: "999px",
          fontSize: "15px",
          fontWeight: 700,
          color: email.colors.text,
        }}
      >
        Orden {orderNumber}
      </Text>
    </Section>
  );
}

/** Tarjeta interior (panel) para agrupar contenido. */
export function EmailPanel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Section
      style={{
        backgroundColor: email.colors.softBg,
        border: `1px solid ${email.colors.border}`,
        borderRadius: "10px",
        padding: "18px 20px",
        margin: "0 0 20px",
        ...style,
      }}
    >
      {children}
    </Section>
  );
}

/** Botón de acción principal. */
export function EmailButton({
  href,
  accent,
  children,
}: {
  href: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: accent,
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: 600,
          padding: "13px 32px",
          borderRadius: "8px",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export function EmailDivider() {
  return <Hr style={{ borderColor: email.colors.border, margin: "20px 0" }} />;
}

export { Section, Text, Img };
