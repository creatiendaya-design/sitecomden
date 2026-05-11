import { notFound } from "next/navigation"
import { protectRoute } from "@/lib/protect-route"
import { getTemplate } from "@/actions/cod-form-templates"
import { getAllShippingRates } from "@/actions/shipping-system"
import { prisma } from "@/lib/db"
import CodFormEditor from "@/components/admin/cod-forms/CodFormEditor"
import type { ShippingOption } from "@/components/shop/cod-form/blocks/ShippingOptionsBlock"
import type { AvailableShippingRate } from "@/components/admin/cod-forms/ShippingRatesPanel"

export const dynamic = "force-dynamic"

type AllRates = Awaited<ReturnType<typeof getAllShippingRates>>["data"]

function pickPreviewShippingOptions(rates: AllRates): ShippingOption[] {
  // Para la vista previa del editor mostramos las tarifas activas de la
  // primera zona activa configurada en /admin/envios. En el storefront real,
  // las opciones se resolverán según la zona del distrito del cliente.
  const usable = rates.filter((r) => r.active && r.zoneActive)
  if (usable.length === 0) return []

  const firstZoneId = usable[0].zoneId
  return usable
    .filter((r) => r.zoneId === firstZoneId)
    .map((r) => ({ id: r.id, label: r.name, price: r.baseCost }))
}

function toAvailableShippingRates(rates: AllRates): AvailableShippingRate[] {
  return rates.map((r) => ({
    id: r.id,
    name: r.name,
    baseCost: r.baseCost,
    zoneId: r.zoneId,
    zoneName: r.zoneName,
    zoneActive: r.zoneActive,
    active: r.active,
    excludeFromRegularCheckout: r.excludeFromRegularCheckout ?? false,
  }))
}

export default async function CodFormEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await protectRoute("cod-forms:view")
  const { id } = await params

  let template
  try {
    template = await getTemplate(id)
  } catch {
    notFound()
  }

  const [pages, ratesResult] = await Promise.all([
    prisma.page.findMany({
      where: { active: true },
      select: { id: true, slug: true, title: true },
      orderBy: { title: "asc" },
    }),
    getAllShippingRates(),
  ])

  const allRates = ratesResult.data
  const shippingOptions = pickPreviewShippingOptions(allRates)
  const availableShippingRates = toAvailableShippingRates(allRates)

  return (
    <CodFormEditor
      template={template}
      pages={pages}
      shippingOptions={shippingOptions}
      availableShippingRates={availableShippingRates}
    />
  )
}
