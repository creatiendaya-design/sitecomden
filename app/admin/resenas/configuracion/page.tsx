export const dynamic = "force-dynamic";

import { protectRoute } from "@/lib/protect-route";
import { getReviewRequestConfig } from "@/actions/review-settings";
import { getReviewRewardConfig } from "@/actions/review-reward-settings";
import ReviewRequestSettingsForm from "@/components/admin/reviews/ReviewRequestSettingsForm";
import ReviewRewardSettingsForm from "@/components/admin/reviews/ReviewRewardSettingsForm";

export default async function ReviewRequestSettingsPage() {
  await protectRoute("reviews:moderate");
  const [requestConfig, rewardConfig] = await Promise.all([
    getReviewRequestConfig(),
    getReviewRewardConfig(),
  ]);

  return (
    <div className="space-y-8 md:space-y-10 p-4 md:p-0">
      <section className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Email post-compra de reseñas
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Envía automáticamente un correo pidiendo una reseña unos días
            después de que el pedido se marca como entregado.
          </p>
        </div>

        <ReviewRequestSettingsForm initialConfig={requestConfig} />
      </section>

      <section className="space-y-4 md:space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">
            Cupón de recompensa por reseña
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Entrega un cupón de descuento cuando apruebas una reseña de compra
            verificada. Se envía por email al cliente.
          </p>
        </div>

        <ReviewRewardSettingsForm initialConfig={rewardConfig} />
      </section>
    </div>
  );
}
