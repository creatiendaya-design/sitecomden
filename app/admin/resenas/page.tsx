export const dynamic = "force-dynamic";

import { Star } from "lucide-react";
import { protectRoute } from "@/lib/protect-route";
import { getReviewsForAdmin, getReviewCounts } from "@/actions/reviews";
import ReviewsModeration from "@/components/admin/reviews/ReviewsModeration";

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await protectRoute("reviews:moderate");

  const { filter } = await searchParams;
  const activeFilter =
    filter === "approved" || filter === "all" ? filter : "pending";

  const [reviewsResult, countsResult] = await Promise.all([
    getReviewsForAdmin(activeFilter),
    getReviewCounts(),
  ]);

  const reviews = reviewsResult.success ? reviewsResult.data ?? [] : [];
  const counts = countsResult.success
    ? countsResult.data ?? { pending: 0, approved: 0, total: 0 }
    : { pending: 0, approved: 0, total: 0 };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold">
          <Star className="h-6 w-6 text-amber-400" />
          Reseñas de productos
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Aprueba o rechaza las reseñas enviadas por los clientes antes de que
          se publiquen en la tienda.
        </p>
      </div>

      <ReviewsModeration
        reviews={reviews}
        counts={counts}
        activeFilter={activeFilter}
      />
    </div>
  );
}
