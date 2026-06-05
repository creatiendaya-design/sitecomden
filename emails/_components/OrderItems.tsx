import * as React from "react";
import { Section, Row, Column, Text, Img, Hr } from "@react-email/components";
import { email } from "./EmailLayout";

export interface EmailOrderItem {
  name: string;
  variantName?: string;
  quantity: number;
  price: number;
  image?: string;
  customDesignImages?: Array<{ zoneId: string; url: string }>;
}

interface OrderItemsProps {
  items: EmailOrderItem[];
  total: number;
  accent: string;
  /** Línea de subtotal/envío/descuento opcional encima del total. */
  summary?: Array<{ label: string; value: string; highlight?: boolean }>;
}

const PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgZmlsbD0iI2NiZDVlMSI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjFmNWY5Ii8+PHBhdGggZD0iTTIwIDQ0bDgtMTAgNiA3IDYtOCA4IDExeiIgZmlsbD0iI2NiZDVlMSIvPjxjaXJjbGUgY3g9IjI0IiBjeT0iMjQiIHI9IjQiIGZpbGw9IiNjYmQ1ZTEiLz48L3N2Zz4=";

/**
 * Lista de productos de una orden para correos, con imagen de cada producto.
 * Usa una tabla (Row/Column de react-email) para compatibilidad con Outlook.
 */
export function EmailOrderItems({ items, total, accent, summary }: OrderItemsProps) {
  return (
    <Section
      style={{
        border: `1px solid ${email.colors.border}`,
        borderRadius: "10px",
        overflow: "hidden",
        margin: "0 0 20px",
      }}
    >
      {items.map((item, index) => (
        <Section
          key={index}
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${email.colors.border}`,
          }}
        >
          <Row>
            <Column style={{ width: "64px", verticalAlign: "top" }}>
              <Img
                src={item.image || PLACEHOLDER}
                alt={item.name}
                width={56}
                height={56}
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  border: `1px solid ${email.colors.border}`,
                  backgroundColor: email.colors.softBg,
                }}
              />
            </Column>
            <Column style={{ verticalAlign: "top", paddingLeft: "12px" }}>
              <Text style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: email.colors.text }}>
                {item.name}
              </Text>
              {item.variantName ? (
                <Text style={{ margin: "2px 0 0", fontSize: "13px", color: email.colors.muted }}>
                  {item.variantName}
                </Text>
              ) : null}
              <Text style={{ margin: "2px 0 0", fontSize: "13px", color: email.colors.muted }}>
                Cantidad: {item.quantity}
              </Text>
            </Column>
            <Column style={{ verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}>
              <Text style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: email.colors.text }}>
                S/ {(item.price * item.quantity).toFixed(2)}
              </Text>
              {item.quantity > 1 ? (
                <Text style={{ margin: "2px 0 0", fontSize: "12px", color: email.colors.mutedLight }}>
                  S/ {item.price.toFixed(2)} c/u
                </Text>
              ) : null}
            </Column>
          </Row>

          {item.customDesignImages && item.customDesignImages.length > 0 ? (
            <Section
              style={{
                marginTop: "10px",
                padding: "10px 12px",
                backgroundColor: "#eff6ff",
                borderRadius: "8px",
              }}
            >
              <Text style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: "#1e3a8a" }}>
                Tu diseño personalizado
              </Text>
              {item.customDesignImages.map((img) => (
                <Text key={img.zoneId} style={{ margin: "2px 0", fontSize: "12px" }}>
                  <a href={img.url} style={{ color: "#2563eb", textDecoration: "underline" }}>
                    Ver {img.zoneId} →
                  </a>
                </Text>
              ))}
            </Section>
          ) : null}
        </Section>
      ))}

      {/* Resumen */}
      <Section style={{ padding: "16px", backgroundColor: email.colors.softBg }}>
        {summary?.map((line) => (
          <Row key={line.label} style={{ marginBottom: "6px" }}>
            <Column>
              <Text
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: line.highlight ? "#16a34a" : email.colors.muted,
                }}
              >
                {line.label}
              </Text>
            </Column>
            <Column style={{ textAlign: "right" }}>
              <Text
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: line.highlight ? "#16a34a" : email.colors.text,
                }}
              >
                {line.value}
              </Text>
            </Column>
          </Row>
        ))}
        {summary && summary.length > 0 ? (
          <Hr style={{ borderColor: email.colors.border, margin: "10px 0" }} />
        ) : null}
        <Row>
          <Column>
            <Text style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: email.colors.text }}>
              Total
            </Text>
          </Column>
          <Column style={{ textAlign: "right" }}>
            <Text style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: accent }}>
              S/ {total.toFixed(2)}
            </Text>
          </Column>
        </Row>
      </Section>
    </Section>
  );
}
