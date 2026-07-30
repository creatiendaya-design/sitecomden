/**
 * Tests de la subida de comprobante manual (Yape/Plin).
 *
 * El hallazgo que cierran (auditoría ADV-01): la acción no miraba el estado y
 * reescribía `status: "pending"` + `paymentStatus: "VERIFYING"` de forma
 * incondicional. Un cliente podía volver a subir una imagen sobre un pago YA
 * VERIFICADO, devolviéndolo a `pending`, y la siguiente aprobación del admin
 * marcaba otra vez la orden PAGADA y descontaba OTRA VEZ el inventario, con un
 * segundo movimiento `SALE` por las mismas unidades.
 *
 * El claim atómico de `approvePendingPayment` impide dos aprobaciones del mismo
 * estado; no impide que alguien recree ese estado desde fuera. Eso se arregla
 * aquí.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    order: { findFirst: vi.fn(), updateMany: vi.fn() },
    pendingPayment: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    order: { updateMany: vi.fn() },
    pendingPayment: { updateMany: vi.fn() },
  },
  put: vi.fn(),
  checkRateLimit: vi.fn(),
  headers: vi.fn(),
  loggerChild: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@vercel/blob", () => ({ put: mocks.put }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/logger", () => ({ logger: { child: () => mocks.loggerChild } }));
vi.mock("@/lib/protect-route", () => ({ protectRoute: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  uploadRateLimiter: {},
}));
vi.mock("@/lib/payments/verify-pending-payment", () => ({
  approvePendingPayment: vi.fn(),
  rejectPendingPayment: vi.fn(),
}));

import { uploadPaymentProof } from "./pending-payments";

/** JPEG mínimo válido: la acción valida magic bytes, no `file.type`. */
function jpegFile(): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  return new File([bytes], "proof.jpg", { type: "image/jpeg" });
}

function formData(): FormData {
  const fd = new FormData();
  fd.set("orderId", "ord_1");
  fd.set("viewToken", "tok_1");
  fd.set("reference", "00123456");
  fd.set("proofImage", jpegFile());
  return fd;
}

interface OrderState {
  status?: string;
  paymentStatus?: string;
  pendingPaymentStatus?: string;
}

function mockOrder({
  status = "PENDING",
  paymentStatus = "PENDING",
  pendingPaymentStatus = "pending",
}: OrderState = {}) {
  mocks.prisma.order.findFirst.mockResolvedValue({
    id: "ord_1",
    status,
    paymentStatus,
    pendingPayment: { id: "pp_1", status: pendingPaymentStatus },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "1.2.3.4" }));
  mocks.checkRateLimit.mockResolvedValue({ success: true });
  mocks.put.mockResolvedValue({ url: "https://blob.test/proof.jpg" });
  mocks.prisma.$transaction.mockImplementation(
    (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx),
  );
  mocks.tx.pendingPayment.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
});

describe("uploadPaymentProof — camino normal", () => {
  it("acepta el comprobante de un pago aún pendiente", async () => {
    mockOrder();

    const result = await uploadPaymentProof(formData());

    expect(result.success).toBe(true);
    expect(mocks.tx.order.updateMany).toHaveBeenCalled();
  });

  // Escribir `status: "pending"` era el vector exacto de la resurrección.
  it("no reescribe el estado del pago, sólo referencia e imagen", async () => {
    mockOrder();

    await uploadPaymentProof(formData());

    const call = mocks.tx.pendingPayment.updateMany.mock.calls[0][0];
    expect(call.data).toEqual({
      reference: "00123456",
      proofImage: "https://blob.test/proof.jpg",
    });
    expect(call.data.status).toBeUndefined();
    // Y sólo prospera si seguía pendiente (CAS, no leer-luego-escribir).
    expect(call.where).toMatchObject({ id: "pp_1", status: "pending" });
  });

  it("sólo mueve a VERIFYING una orden que aún lo admite", async () => {
    mockOrder();

    await uploadPaymentProof(formData());

    const where = mocks.tx.order.updateMany.mock.calls[0][0].where;
    expect(where.status.notIn).toEqual(
      expect.arrayContaining(["CANCELLED", "REFUNDED"]),
    );
    expect(where.paymentStatus.in).toEqual(["PENDING", "VERIFYING"]);
  });
});

describe("uploadPaymentProof — ADV-01: no revivir un pago resuelto", () => {
  it("rechaza el reupload sobre un pago ya verificado", async () => {
    mockOrder({ pendingPaymentStatus: "verified", paymentStatus: "PAID", status: "PAID" });

    const result = await uploadPaymentProof(formData());

    expect(result.success).toBe(false);
    expect(result.error).toContain("ya fue verificado");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza el reupload sobre un pago ya rechazado", async () => {
    mockOrder({
      pendingPaymentStatus: "rejected",
      paymentStatus: "FAILED",
      status: "CANCELLED",
    });

    const result = await uploadPaymentProof(formData());

    expect(result.success).toBe(false);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza el comprobante sobre un pedido cancelado", async () => {
    mockOrder({ status: "CANCELLED" });

    const result = await uploadPaymentProof(formData());

    expect(result.success).toBe(false);
    expect(result.error).toContain("cerrado");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza el comprobante sobre un pedido ya pagado", async () => {
    mockOrder({ paymentStatus: "PAID" });

    const result = await uploadPaymentProof(formData());

    expect(result.success).toBe(false);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("uploadPaymentProof — carrera con el admin", () => {
  // Las comprobaciones de estado son leer-luego-escribir: la subida a Blob abre
  // una ventana de cientos de ms en la que el admin puede aprobar o rechazar.
  it("aborta si el pago deja de estar pendiente durante la subida", async () => {
    mockOrder();
    mocks.tx.pendingPayment.updateMany.mockResolvedValue({ count: 0 });

    const result = await uploadPaymentProof(formData());

    expect(result.success).toBe(false);
    expect(result.error).toContain("cambió");
  });

  it("aborta si la orden deja de admitir el comprobante durante la subida", async () => {
    mockOrder();
    mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });

    const result = await uploadPaymentProof(formData());

    expect(result.success).toBe(false);
    expect(result.error).toContain("cambió");
  });

  it("no autoriza sin viewToken correcto", async () => {
    mocks.prisma.order.findFirst.mockResolvedValue(null);

    const result = await uploadPaymentProof(formData());

    expect(result.success).toBe(false);
    expect(mocks.put).not.toHaveBeenCalled();
  });
});
