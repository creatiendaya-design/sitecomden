import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface PolicyPageParams {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PolicyPageParams): Promise<Metadata> {
  const { slug } = await params
  const policy = await prisma.policy.findUnique({
    where: { slug, active: true },
    select: {
      title: true,
      seoTitle: true,
      seoDescription: true,
      seoImage: true,
      noIndex: true,
    },
  })
  if (!policy) return {}

  const title = policy.seoTitle ?? policy.title
  const description = policy.seoDescription ?? undefined
  const imageUrl = policy.seoImage ?? undefined

  return {
    title,
    description,
    robots: policy.noIndex ? { index: false, follow: false } : undefined,
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

export default async function PolicyPage({ params }: PolicyPageParams) {
  const { slug } = await params
  const policy = await prisma.policy.findUnique({
    where: { slug, active: true },
    select: {
      title: true,
      body: true,
      updatedAt: true,
    },
  })
  if (!policy) notFound()

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {policy.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-2">
          Última actualización:{" "}
          {policy.updatedAt.toLocaleDateString("es-PE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {policy.body ? (
        <article
          className="prose prose-sm sm:prose-base max-w-none"
          dangerouslySetInnerHTML={{ __html: policy.body }}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Esta política aún no tiene contenido.
        </p>
      )}
    </div>
  )
}
