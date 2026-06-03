import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/sanitize";
import { getReviewRequestConfig } from "@/actions/review-settings";

/**
 * Post-purchase "leave a review" email job.
 *
 * Scheduler-agnostic: hit this with a daily GET from any external cron
 * (cron-job.org, EasyCron, GitHub Actions, Vercel Cron — whatever). Auth uses
 * the same `CRON_SECRET` Bearer pattern as /api/internal/warmup, so configure
 * the caller to send `Authorization: Bearer <CRON_SECRET>`.
 *
 * For each DELIVERED order older than `daysAfterDelivery` that hasn't been
 * emailed yet (`reviewRequestSentAt IS NULL`), it sends one email listing the
 * purchased products with a link to each product page, then stamps
 * `reviewRequestSentAt` so the order is never emailed twice.
 */
export const dynamic = "force-dynamic";

// Cap how many we send per run so a backlog can't blow the function timeout
// or the email provider's rate limit. The daily cadence drains the rest.
const BATCH_LIMIT = 50;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const config = await getReviewRequestConfig();
  if (!config.enabled) {
    return NextResponse.json({ ok: true, skipped: "disabled", sent: 0 });
  }

  const cutoff = new Date(
    Date.now() - config.daysAfterDelivery * 24 * 60 * 60 * 1000
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "DELIVERED",
        reviewRequestSentAt: null,
        deliveredAt: { not: null, lte: cutoff },
        customerEmail: { not: "" },
      },
      orderBy: { deliveredAt: "asc" },
      take: BATCH_LIMIT,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        items: {
          where: { productId: { not: null } },
          select: {
            name: true,
            image: true,
            product: { select: { slug: true, active: true } },
          },
        },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const order of orders) {
      // Only feature products that still exist and are active.
      const products = order.items
        .filter((it) => it.product?.slug && it.product.active)
        .map((it) => ({
          name: it.name,
          image: it.image,
          slug: it.product!.slug,
        }));

      // Nothing reviewable (all products gone/inactive) — stamp it so we don't
      // keep re-scanning this order every day, but don't send an empty email.
      if (products.length === 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: { reviewRequestSentAt: new Date() },
        });
        skipped++;
        continue;
      }

      const productsHtml = products
        .map((p) => {
          const url = `${appUrl}/productos/${p.slug}#reviews`;
          const img = p.image
            ? `<img src="${escapeHtml(p.image)}" alt="" width="56" height="56" style="border-radius:6px;object-fit:cover;vertical-align:middle;margin-right:12px;" />`
            : "";
          return `
            <tr>
              <td style="padding:8px 0;">
                ${img}
                <a href="${url}" style="color:#111;text-decoration:none;font-weight:600;">${escapeHtml(p.name)}</a>
              </td>
            </tr>`;
        })
        .join("");

      const firstUrl = `${appUrl}/productos/${products[0].slug}#reviews`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color:#111;">${escapeHtml(config.subject)}</h2>
          <p>Hola ${escapeHtml(order.customerName) || "cliente"},</p>
          <p>${escapeHtml(config.message)}</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            ${productsHtml}
          </table>
          <p style="text-align:center;margin:28px 0;">
            <a href="${firstUrl}" style="background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
              ${escapeHtml(config.buttonText)}
            </a>
          </p>
          <p style="color:#666;font-size:12px;margin-top:30px;">
            Este es un mensaje automático, por favor no responder.
          </p>
        </div>`;

      const result = await sendEmail({
        to: order.customerEmail,
        subject: config.subject,
        html,
      });

      // Stamp regardless of provider success: a hard-bounce email shouldn't be
      // retried daily forever. (Resend handles transient retries internally.)
      await prisma.order.update({
        where: { id: order.id },
        data: { reviewRequestSentAt: new Date() },
      });

      if (result.success) sent++;
      else skipped++;
    }

    return NextResponse.json({
      ok: true,
      scanned: orders.length,
      sent,
      skipped,
    });
  } catch (error) {
    console.error("Error sending review requests:", error);
    return NextResponse.json(
      { ok: false, error: "Error al procesar las solicitudes de reseña" },
      { status: 500 }
    );
  }
}
