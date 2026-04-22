import { prisma } from "./db";
import { buildNubefactItem, buildTotals } from "./sunat-igv";
import type {
  SunatProvider,
  SunatConfig,
  NubefactPayload,
  NubefactResponse,
} from "./sunat-types";
import type { DocumentType, Order, ElectronicDocument } from "@prisma/client";

type OrderWithItems = Order & {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    sku: string | null;
    productId: string | null;
  }>;
};

async function allocateDocument(
  series: string,
  orderId: string,
  type: DocumentType
): Promise<ElectronicDocument> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const last = await tx.electronicDocument.findFirst({
            where: { series },
            orderBy: { number: "desc" },
          });
          const number = (last?.number ?? 0) + 1;
          const fullNumber = `${series}-${String(number).padStart(8, "0")}`;
          return tx.electronicDocument.create({
            data: { orderId, type, series, number, fullNumber, status: "PENDING" },
          });
        },
        { isolationLevel: "Serializable" }
      );
    } catch (err: unknown) {
      const isUniqueViolation =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002";
      if (!isUniqueViolation || attempt === 2) throw err;
    }
  }
  throw new Error("Failed to allocate document number after 3 attempts");
}

export class NubefactProvider implements SunatProvider {
  async emitDocument(
    order: OrderWithItems,
    type: DocumentType,
    config: SunatConfig
  ): Promise<ElectronicDocument> {
    const series = type === "BOLETA" ? config.boletaSeries : config.facturaSeries;

    const doc = await allocateDocument(series, order.id, type);

    try {
      const productIds = order.items
        .map((i) => i.productId)
        .filter((id): id is string => id !== null);

      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, igvType: true },
      });
      const igvMap = new Map(products.map((p) => [p.id, p.igvType]));

      const nubefactItems = order.items.map((item) => {
        const igvType = (item.productId ? igvMap.get(item.productId) : undefined) ?? "GRAVADO";
        return buildNubefactItem({
          description: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: Number(item.price),
          igvType,
          pricesIncludeIgv: config.pricesIncludeIgv,
        });
      });

      const totals = buildTotals(nubefactItems);

      const isFactura = type === "FACTURA";
      const clientDocType = isFactura ? 6 : order.customerDni ? 1 : 0;
      const clientDocNumber = isFactura ? (order.buyerRuc ?? "") : (order.customerDni ?? "");
      const clientName = isFactura ? (order.buyerRazonSocial ?? order.customerName) : order.customerName;
      const clientAddress = isFactura ? (order.buyerFiscalAddress ?? "") : "";

      const today = new Date().toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const payload: NubefactPayload = {
        operacion: "generar_comprobante",
        tipo_de_comprobante: type === "FACTURA" ? 1 : 2,
        serie: series,
        numero: doc.number,
        sunat_transaction: 1,
        cliente_tipo_de_documento: clientDocType as 0 | 1 | 6,
        cliente_numero_de_documento: clientDocNumber,
        cliente_denominacion: clientName,
        cliente_direccion: clientAddress,
        cliente_email: order.customerEmail,
        fecha_de_emision: today,
        moneda: 1,
        porcentaje_de_igv: 18.0,
        total_gravada: totals.totalGravada,
        total_inafecta: totals.totalInafecta,
        total_exonerada: totals.totalExonerada,
        total_igv: totals.totalIgv,
        total: totals.total,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: false,
        items: nubefactItems,
      };

      const response = await fetch(config.apiUrl, {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result: NubefactResponse = await response.json();

      if (!response.ok || result.codigo !== 0) {
        const errorMsg = result.errors?.join(", ") || result.sunat_description || "Error desconocido";
        return prisma.electronicDocument.update({
          where: { id: doc.id },
          data: { status: "ERROR", errorMessage: errorMsg },
        });
      }

      return prisma.electronicDocument.update({
        where: { id: doc.id },
        data: {
          status: "ISSUED",
          pdfUrl: result.enlace_del_pdf,
          xmlUrl: result.enlace_del_xml,
          cdrUrl: result.enlace_del_cdr,
          hash: result.codigo_hash,
          nubefactId: String(result.numero),
          sunatCode: result.codigo,
          issuedAt: new Date(),
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error de conexión";
      return prisma.electronicDocument.update({
        where: { id: doc.id },
        data: { status: "ERROR", errorMessage },
      });
    }
  }

  async cancelDocument(
    documentId: string,
    reason: string,
    config: SunatConfig
  ): Promise<void> {
    const doc = await prisma.electronicDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    if (doc.status !== "ISSUED") {
      throw new Error(`Cannot cancel document with status ${doc.status}`);
    }

    const payload = {
      operacion: "generar_anulacion",
      tipo_de_comprobante: doc.type === "FACTURA" ? 1 : 2,
      serie: doc.series,
      numero: doc.number,
      fecha_de_emision: doc.issuedAt
        ? doc.issuedAt.toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "",
      motivo: reason,
    };

    const response = await fetch(config.apiUrl, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const body = isJson ? await response.json() : null;
      const errorMsg = body?.errors?.join(", ") || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    await prisma.electronicDocument.update({
      where: { id: documentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  async resendEmail(
    _documentId: string,
    _email: string,
    _config: SunatConfig
  ): Promise<void> {
    // Email resend is handled in actions/sunat.ts via Resend directly
  }
}
