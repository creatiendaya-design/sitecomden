import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { formatOrderNumber } from "@/lib/utils";
import Papa from "papaparse";

function fmt(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function GET(request: Request) {
  const { response: authResponse } = await requirePermission("orders:view");
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const where: Record<string, unknown> = {};

  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  if (desde || hasta) {
    const createdAt: Record<string, Date> = {};
    if (desde) createdAt.gte = new Date(desde);
    if (hasta) {
      const end = new Date(hasta);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  const statuses = searchParams.getAll("status");
  if (statuses.length > 0) where.status = { in: statuses };

  const methods = searchParams.getAll("payment");
  if (methods.length > 0) where.paymentMethod = { in: methods };

  const productId = searchParams.get("productId");
  const categoryId = searchParams.get("categoryId");
  const itemsConditions: Record<string, unknown>[] = [];
  if (productId) itemsConditions.push({ productId });
  if (categoryId)
    itemsConditions.push({
      product: { categories: { some: { categoryId } } },
    });
  if (itemsConditions.length === 1) where.items = { some: itemsConditions[0] };
  if (itemsConditions.length > 1)
    where.items = { some: { AND: itemsConditions } };

  const department = searchParams.get("department");
  const province = searchParams.get("province");
  const district = searchParams.get("district");
  const addressConditions: Record<string, unknown>[] = [];
  if (department)
    addressConditions.push({
      shippingAddress: { path: ["department"], equals: department },
    });
  if (province)
    addressConditions.push({
      shippingAddress: { path: ["province"], equals: province },
    });
  if (district)
    addressConditions.push({
      shippingAddress: { path: ["district"], equals: district },
    });
  if (addressConditions.length === 1) Object.assign(where, addressConditions[0]);
  if (addressConditions.length > 1) where.AND = addressConditions;

  const q = searchParams.get("q");
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
    ];
  }

  const montoMin = searchParams.get("montoMin");
  const montoMax = searchParams.get("montoMax");
  if (montoMin || montoMax) {
    const total: Record<string, number> = {};
    if (montoMin) total.gte = parseFloat(montoMin);
    if (montoMax) total.lte = parseFloat(montoMax);
    where.total = total;
  }

  const settings = await getSiteSettings();
  const orderPrefix = settings.order_prefix ?? "PED";

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((o) => {
    const addr = (o.shippingAddress as Record<string, string>) ?? {};
    const itemsSummary = o.items
      .map((i) => `${i.name} x${i.quantity}`)
      .join("; ");
    return {
      "Número de orden": formatOrderNumber(o.orderSeq, orderPrefix),
      Fecha: fmt(o.createdAt),
      Estado: o.status,
      "Estado de pago": o.paymentStatus,
      "Estado de envío": o.fulfillmentStatus ?? "",
      Cliente: o.customerName,
      DNI: o.customerDni ?? "",
      Email: o.customerEmail,
      Teléfono: o.customerPhone,
      "Tipo de documento": o.documentType ?? "",
      RUC: o.buyerRuc ?? "",
      "Razón social": o.buyerRazonSocial ?? "",
      "Método de pago": o.paymentMethod,
      "Método de envío": o.shippingMethod ?? "",
      Subtotal: Number(o.subtotal).toFixed(2),
      Descuento: Number(o.discount).toFixed(2),
      Cupón: o.couponCode ?? "",
      "Descuento cupón": o.couponDiscount
        ? Number(o.couponDiscount).toFixed(2)
        : "",
      IGV: Number(o.tax).toFixed(2),
      Envío: Number(o.shipping).toFixed(2),
      Total: Number(o.total).toFixed(2),
      Productos: itemsSummary,
      "Notas del cliente": o.customerNotes ?? "",
      Dirección: addr.address ?? "",
      Distrito: addr.district ?? "",
      Provincia: addr.province ?? "",
      Departamento: addr.department ?? "",
      "Número de seguimiento": o.trackingNumber ?? "",
      Courier: o.shippingCourier ?? "",
      "Entrega estimada": fmtDate(o.estimatedDelivery),
      "Fecha de pago": fmt(o.paidAt),
      "Fecha de envío": fmt(o.shippedAt),
      "Fecha de entrega": fmt(o.deliveredAt),
      "Puntos ganados": o.pointsEarned,
      "Puntos usados": o.pointsUsed,
      "Notas admin": o.adminNotes ?? "",
    };
  });

  const csv = Papa.unparse(rows);
  const date = new Date().toISOString().split("T")[0];
  const BOM = "﻿";

  return new NextResponse(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ordenes-${date}.csv"`,
    },
  });
}
