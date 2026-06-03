import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, formRateLimiter } from "@/lib/rate-limit";
import { submitReview } from "@/actions/reviews";

/**
 * Public endpoint for storefront review submissions. Rate-limited per IP
 * (shares the forms limiter: 3/hour) to deter spam. Validation, the
 * verified-purchase check, and the `approved: false` default all live in the
 * `submitReview` server action.
 */
export async function POST(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, formRateLimiter, {
    action: "review_submit",
    errorMessage:
      "Has enviado demasiadas reseñas. Intenta nuevamente más tarde.",
  });
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Cuerpo de la petición inválido" },
      { status: 400 }
    );
  }

  const result = await submitReview(body);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message:
      "¡Gracias por tu reseña! Será publicada una vez que la revisemos.",
  });
}
