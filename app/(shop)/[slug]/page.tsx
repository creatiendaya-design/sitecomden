import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import LandingBlockRenderer from "@/components/shop/templates/blocks/LandingBlockRenderer"
import type { LandingBlock } from "@/lib/types/landing-blocks"
import { isReservedSlug } from "@/lib/pages/reserved-slugs"
import { getActiveThemeHome } from "@/lib/themes/get-active-theme-home"
import { getActiveThemeCart } from "@/lib/themes/get-active-theme-cart"

interface DynamicPageParams {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: DynamicPageParams) {
  const { slug } = await params
  if (isReservedSlug(slug)) return {}
  // Pages assigned as the active theme's home (Plan 6) or cart (Plan 10)
  // are canonically served at "/" and "/carrito" respectively. The route
  // handler redirects there; emit empty metadata so the SEO meta from the
  // visit at "/<slug>" never gets indexed.
  const [themeHome, themeCart] = await Promise.all([
    getActiveThemeHome(),
    getActiveThemeCart(),
  ])
  if (themeHome && themeHome.slug === slug) return {}
  if (themeCart && themeCart.slug === slug) return {}
  const page = await prisma.page.findUnique({
    where: { slug, active: true },
    select: {
      title: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      seoImage: true,
      noIndex: true,
    },
  })
  if (!page) return {}
  // SEO fields override the visible title/description; visible fields are
  // the fallback so search engines never get an empty meta.
  const title = page.seoTitle ?? page.title
  const description = page.seoDescription ?? page.description ?? undefined
  const imageUrl = page.seoImage ?? undefined

  return {
    title,
    description,
    robots: page.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

export default async function DynamicPage({ params }: DynamicPageParams) {
  const { slug } = await params
  if (isReservedSlug(slug)) notFound()

  // Redirect to canonical URLs when this slug matches a theme-managed page:
  //   home → /
  //   cart → /carrito
  // Keeps a single URL per surface for SEO + bookmark consistency.
  const [themeHome, themeCart] = await Promise.all([
    getActiveThemeHome(),
    getActiveThemeCart(),
  ])
  if (themeHome && themeHome.slug === slug) redirect("/")
  if (themeCart && themeCart.slug === slug) redirect("/carrito")

  const page = await prisma.page.findUnique({
    where: { slug, active: true },
    include: { pageBlocks: { orderBy: { position: "asc" } } },
  })
  if (!page) notFound()

  const blocks: LandingBlock[] = page.pageBlocks.map((b) => ({
    id: b.id,
    productId: "",
    type: b.type,
    position: b.position,
    content: b.content as LandingBlock["content"],
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  return (
    <div className="min-h-screen">
      <LandingBlockRenderer blocks={blocks} />
    </div>
  )
}
