"use server";

import { prisma } from "@/lib/db";
import { getSunatProvider, getSunatConfig } from "@/lib/sunat";
import { encrypt } from "@/lib/sunat-crypto";
import { protectRoute } from "@/lib/protect-route";
import { revalidatePath } from "next/cache";
import { sendComprobanteEmail } from "@/lib/email";
import type { DocumentType, Prisma } from "@prisma/client";

// ── Emitir comprobante manualmente desde admin ──────────────────
export async function emitDocumentAction(orderId: string) {
  await protectRoute("orders:update");

  const config = await getSunatConfig();
  if (!config) return { success: false, error: "Facturación electrónica no configurada" };

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order.documentType) {
    return { success: false, error: "La orden no tiene tipo de comprobante definido" };
  }

  const existing = await prisma.electronicDocument.findUnique({ where: { orderId } });
  if (existing && existing.status === "ISSUED") {
    return { success: false, error: "Ya existe un comprobante emitido para esta orden" };
  }

  const provider = getSunatProvider();
  const orderForEmit = {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  };
  const doc = await provider.emitDocument(orderForEmit, order.documentType, config);

  if (doc.status === "ISSUED" && doc.pdfUrl) {
    await sendComprobanteEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      documentNumber: doc.fullNumber,
      total: Number(order.total),
      pdfUrl: doc.pdfUrl,
    });
  }

  revalidatePath(`/admin/ordenes/${orderId}`);
  revalidatePath("/admin/facturacion");

  return { success: true, document: doc };
}

// ── Reenviar email del comprobante ──────────────────────────────
export async function resendComprobanteEmailAction(orderId: string) {
  await protectRoute("orders:update");

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const doc = await prisma.electronicDocument.findUnique({ where: { orderId } });

  if (!doc || doc.status !== "ISSUED" || !doc.pdfUrl) {
    return { success: false, error: "No hay comprobante emitido para reenviar" };
  }

  await sendComprobanteEmail({
    to: order.customerEmail,
    customerName: order.customerName,
    orderNumber: order.orderNumber,
    documentNumber: doc.fullNumber,
    total: Number(order.total),
    pdfUrl: doc.pdfUrl,
  });

  return { success: true };
}

// ── Anular comprobante ──────────────────────────────────────────
export async function cancelDocumentAction(documentId: string, reason: string) {
  await protectRoute("orders:update");

  const config = await getSunatConfig();
  if (!config) return { success: false, error: "Facturación electrónica no configurada" };

  const provider = getSunatProvider();
  await provider.cancelDocument(documentId, reason, config);

  revalidatePath("/admin/facturacion");

  return { success: true };
}

// ── Guardar configuración SUNAT ─────────────────────────────────
export async function saveSunatConfigAction(data: {
  enabled: boolean;
  emissionMode: "auto" | "manual" | "mixed";
  apiKey: string;
  apiUrl: string;
  ruc: string;
  razonSocial: string;
  address: string;
  boletaSeries: string;
  facturaSeries: string;
  pricesIncludeIgv: boolean;
}) {
  await protectRoute("settings:edit");

  const isNewKey = data.apiKey && !data.apiKey.startsWith("ENCRYPTED");
  const encryptedKey = isNewKey ? encrypt(data.apiKey) : data.apiKey;

  const entries: Array<[string, Prisma.InputJsonValue]> = [
    ["sunat_enabled", data.enabled],
    ["sunat_emission_mode", data.emissionMode],
    ["sunat_api_key", encryptedKey],
    ["sunat_api_url", data.apiUrl],
    ["sunat_ruc", data.ruc],
    ["sunat_razon_social", data.razonSocial],
    ["sunat_address", data.address],
    ["sunat_boleta_series", data.boletaSeries],
    ["sunat_factura_series", data.facturaSeries],
    ["sunat_prices_include_igv", data.pricesIncludeIgv],
  ];

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value, category: "sunat" },
      })
    )
  );

  revalidatePath("/admin/configuracion/sunat");
  return { success: true };
}

const ALLOWED_NUBEFACT_HOSTS = ["demo-ose.nubefact.com", "ose.nubefact.com"];

// ── Probar conexión con Nubefact ────────────────────────────────
export async function testSunatConnectionAction(apiKey: string, apiUrl: string) {
  await protectRoute("settings:edit");

  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== "https:" || !ALLOWED_NUBEFACT_HOSTS.includes(parsed.hostname)) {
      return { success: false, error: "URL no permitida. Use una URL oficial de Nubefact." };
    }
  } catch {
    return { success: false, error: "URL inválida" };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({ operacion: "consultar_serie" }),
    });

    if (response.status === 401) return { success: false, error: "API Key inválida" };
    if (response.status === 404) return { success: false, error: "URL incorrecta" };

    return { success: true };
  } catch {
    return { success: false, error: "No se pudo conectar con Nubefact" };
  }
}

// ── Emitir automáticamente al confirmar pago (uso interno) ─────
export async function autoEmitOnPayment(orderId: string) {
  const config = await getSunatConfig();
  if (!config || config.emissionMode === "manual") return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order?.documentType) return;

  const isFactura = order.documentType === ("FACTURA" as DocumentType);
  if (config.emissionMode === "mixed" && isFactura) return;

  const existing = await prisma.electronicDocument.findUnique({ where: { orderId } });
  if (existing) return;

  const provider = getSunatProvider();
  const orderForEmit = {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  };
  const doc = await provider.emitDocument(orderForEmit, order.documentType, config);

  if (doc.status === "ISSUED" && doc.pdfUrl) {
    await sendComprobanteEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      documentNumber: doc.fullNumber,
      total: Number(order.total),
      pdfUrl: doc.pdfUrl,
    });
  }
}
