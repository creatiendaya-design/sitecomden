export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { formatPeruDateTime } from "@/lib/format-date";
import ShippingLabel from "@/components/admin/orders/ShippingLabel";
import {
  buildShippingLabelData,
  isLabelFormatId,
  LABEL_FORMATS,
  type LabelFormatId,
} from "@/lib/orders/shipping-label";
import LabelToolbar from "./LabelToolbar";
import { getLabelStyles } from "./label-styles";

interface ShippingLabelPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ formato?: string }>;
}

export const metadata = {
  title: "Etiqueta de envío",
};

export default async function ShippingLabelPage({
  params,
  searchParams,
}: ShippingLabelPageProps) {
  const { orderId } = await params;
  const { formato } = await searchParams;

  const format: LabelFormatId = isLabelFormatId(formato)
    ? formato
    : LABEL_FORMATS.THERMAL.id;

  const [order, siteSettings] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderSeq: true,
        orderNumber: true,
        createdAt: true,
        customerName: true,
        customerPhone: true,
        customerDni: true,
        customerNotes: true,
        shippingAddress: true,
        paymentMethod: true,
        paymentStatus: true,
        shippingCourier: true,
        trackingNumber: true,
        total: true,
        items: {
          select: { name: true, variantName: true, sku: true, quantity: true },
        },
      },
    }),
    getSiteSettings(),
  ]);

  if (!order) notFound();

  const data = buildShippingLabelData(
    order,
    {
      name: siteSettings.site_name,
      phone: siteSettings.contact_phone,
      address: siteSettings.contact_address,
    },
    siteSettings.order_prefix || "PED",
    formatPeruDateTime(order.createdAt)
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: getLabelStyles(format) }} />
      <LabelToolbar orderId={order.id} format={format} />
      <div className="label-screen bg-slate-100 py-8">
        <ShippingLabel data={data} format={format} />
      </div>
    </>
  );
}
