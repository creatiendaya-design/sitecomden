export const dynamic = "force-dynamic";

import { protectRoute } from "@/lib/protect-route";
import { getReviewRequestConfig } from "@/actions/review-settings";
import ReviewRequestSettingsForm from "@/components/admin/reviews/ReviewRequestSettingsForm";

export default async function ReviewRequestSettingsPage() {
  await protectRoute("reviews:moderate");
  const config = await getReviewRequestConfig();

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Email post-compra de reseñas
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Envía automáticamente un correo pidiendo una reseña unos días después
          de que el pedido se marca como entregado.
        </p>
      </div>

      <ReviewRequestSettingsForm initialConfig={config} />
    </div>
  );
}
