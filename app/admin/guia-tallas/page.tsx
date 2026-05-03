// app/admin/guia-tallas/page.tsx
import { protectRoute } from "@/lib/protect-route";
import { listSizeGuides } from "@/actions/size-guides";
import { SizeGuidesList } from "@/components/admin/size-guides/SizeGuidesList";

export const dynamic = "force-dynamic";

export default async function SizeGuidesPage() {
  await protectRoute("size-guides:view");

  const result = await listSizeGuides();
  if (!result.success) {
    return <p className="text-red-600">{result.error}</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Guías de Tallas</h1>
      </header>
      <SizeGuidesList items={result.data} />
    </div>
  );
}
