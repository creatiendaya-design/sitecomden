export const dynamic = "force-dynamic";

import { listAllPromotions } from "@/actions/promotions";
import PromotionsListClient from "@/components/admin/promotions/PromotionsListClient";

export default async function PromotionsPage() {
  const promotions = await listAllPromotions();
  return <PromotionsListClient initialPromotions={promotions} />;
}
