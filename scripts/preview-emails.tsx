/**
 * Renderiza las plantillas de correo a archivos HTML en .email-preview/
 * para inspección visual. Uso: npx tsx scripts/preview-emails.tsx
 */
import { render } from "@react-email/render";
import * as fs from "fs";
import * as path from "path";
import OrderConfirmationEmail from "../emails/OrderConfirmationEmail";
import PaymentApprovedEmail from "../emails/PaymentApprovedEmail";
import OrderShippedEmail from "../emails/OrderShippedEmail";
import OrderDeliveredEmail from "../emails/OrderDeliveredEmail";
import OrderCancelledEmail from "../emails/OrderCancelledEmail";
import PaymentFailedEmail from "../emails/PaymentFailedEmail";
import PaymentRefundedEmail from "../emails/PaymentRefundedEmail";
import ComprobanteEmitido from "../emails/comprobante-emitido";

const siteSettings = {
  storeName: "ShopGood Perú",
  logoUrl: "https://dummyimage.com/200x44/111827/ffffff&text=ShopGood",
  primaryColor: "#4f46e5",
};

const items = [
  {
    name: "Polo Oversize Algodón Pima",
    variantName: "Talla M / Negro",
    quantity: 2,
    price: 59.9,
    image: "https://dummyimage.com/120x120/eeeeee/333333&text=Polo",
  },
  {
    name: "Gorra Trucker Bordada",
    quantity: 1,
    price: 39.9,
    image: "https://dummyimage.com/120x120/dddddd/333333&text=Gorra",
  },
];

const shippingAddress = {
  address: "Av. Larco 123, Dpto 401",
  district: "Miraflores",
  city: "Lima",
  department: "Lima",
};
const viewOrderLink = "https://shopgood.pe/orden/verificar?token=abc";

const previews: Record<string, React.ReactElement> = {
  "order-confirmation": OrderConfirmationEmail({
    orderNumber: "PED-0042",
    customerName: "María",
    total: 159.7,
    items,
    shippingAddress,
    paymentMethod: "YAPE",
    viewOrderLink,
    siteSettings,
  }),
  "payment-approved": PaymentApprovedEmail({
    orderNumber: "PED-0042",
    customerName: "María",
    total: 159.7,
    viewOrderLink,
    siteSettings,
  }),
  "order-shipped": OrderShippedEmail({
    orderNumber: "PED-0042",
    customerName: "María",
    trackingNumber: "ABCD1234567",
    shippingCourier: "Olva Courier",
    estimatedDelivery: "2026-06-10",
    viewOrderLink,
    siteSettings,
  }),
  "order-delivered": OrderDeliveredEmail({
    orderNumber: "PED-0042",
    customerName: "María",
    viewOrderLink,
    siteSettings,
  }),
  "order-cancelled": OrderCancelledEmail({
    orderNumber: "PED-0042",
    customerName: "María",
    cancellationReason: "Producto sin stock",
    viewOrderLink,
    siteSettings,
  }),
  "payment-failed": PaymentFailedEmail({
    orderNumber: "PED-0042",
    customerName: "María",
    total: 159.7,
    failureReason: "Fondos insuficientes",
    viewOrderLink,
    siteSettings,
  }),
  "payment-refunded": PaymentRefundedEmail({
    orderNumber: "PED-0042",
    customerName: "María",
    refundAmount: 159.7,
    refundReason: "Devolución solicitada",
    viewOrderLink,
    siteSettings,
  }),
  comprobante: ComprobanteEmitido({
    customerName: "María",
    orderNumber: "PED-0042",
    documentNumber: "B001-0042",
    total: 159.7,
    pdfUrl: "https://shopgood.pe/doc.pdf",
    siteSettings,
  }),
};

async function main() {
  const outDir = path.join(process.cwd(), ".email-preview");
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, element] of Object.entries(previews)) {
    const html = await render(element);
    fs.writeFileSync(path.join(outDir, `${name}.html`), html, "utf8");
    console.log(`✓ ${name}.html`);
  }
  console.log(`\nRendered ${Object.keys(previews).length} emails to ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
