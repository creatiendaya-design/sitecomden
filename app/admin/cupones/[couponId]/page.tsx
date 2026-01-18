import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EditCouponForm from "@/components/admin/EditCouponForm";

interface EditCouponPageProps {
  params: Promise<{
    couponId: string;
  }>;
}

export default async function EditCouponPage({ params }: EditCouponPageProps) {
  const { couponId } = await params;

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) {
    notFound();
  }

  // Serializar datos
  const serializedCoupon = {
    ...coupon,
    value: Number(coupon.value),
    minPurchase: coupon.minPurchase ? Number(coupon.minPurchase) : null,
    maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    startsAt: coupon.startsAt ? coupon.startsAt.toISOString() : null,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
  };

  return <EditCouponForm coupon={serializedCoupon} />;
}