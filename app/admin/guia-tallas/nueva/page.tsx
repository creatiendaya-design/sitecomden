// app/admin/guia-tallas/nueva/page.tsx
import { protectRoute } from "@/lib/protect-route";
import { SizeGuideForm } from "@/components/admin/size-guides/SizeGuideForm";

export const dynamic = "force-dynamic";

export default async function NewSizeGuidePage() {
  await protectRoute("size-guides:create");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nueva guía de tallas</h1>
      <SizeGuideForm initial={null} />
    </div>
  );
}
