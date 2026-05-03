// app/admin/guia-tallas/[id]/page.tsx
import { notFound } from "next/navigation";
import { protectRoute } from "@/lib/protect-route";
import { getSizeGuide } from "@/actions/size-guides";
import { SizeGuideForm } from "@/components/admin/size-guides/SizeGuideForm";

export const dynamic = "force-dynamic";

export default async function EditSizeGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await protectRoute("size-guides:update");
  const { id } = await params;

  const result = await getSizeGuide(id);
  if (!result.success) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Editar: {result.data.name}</h1>
      <SizeGuideForm initial={result.data} />
    </div>
  );
}
