import { redirect } from "next/navigation";

export default async function LegacyDistrictsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/envios/zonas/${id}?tab=distritos`);
}
