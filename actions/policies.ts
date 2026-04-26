"use server"

import { prisma } from "@/lib/db"
import { revalidatePath, updateTag } from "next/cache"
import { protectRoute } from "@/lib/protect-route"

/** Discriminator stored on Policy.policyType. Lets the system auto-link
 * "the privacy policy" from checkout/footer regardless of slug. */
export type PolicyType = "TERMS" | "PRIVACY" | "SHIPPING" | "REFUND" | "OTHER"

const VALID_POLICY_TYPES: ReadonlySet<PolicyType> = new Set([
  "TERMS",
  "PRIVACY",
  "SHIPPING",
  "REFUND",
  "OTHER",
])

export interface PolicyRow {
  id: string
  slug: string
  title: string
  /** Excerpt of the body for the list view; full body is loaded by getPolicy. */
  bodyExcerpt: string
  active: boolean
  noIndex: boolean
  policyType: PolicyType | null
  updatedAt: Date
}

export interface PolicyFull {
  id: string
  slug: string
  title: string
  body: string
  active: boolean
  seoTitle: string | null
  seoDescription: string | null
  seoImage: string | null
  noIndex: boolean
  policyType: PolicyType | null
  updatedAt: Date
}

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function asPolicyType(input: unknown): PolicyType | null {
  if (typeof input !== "string") return null
  return VALID_POLICY_TYPES.has(input as PolicyType) ? (input as PolicyType) : null
}

function bodyExcerpt(html: string, max = 160): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

export async function listPolicies(): Promise<PolicyRow[]> {
  await protectRoute("policies:view")
  const rows = await prisma.policy.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      active: true,
      noIndex: true,
      policyType: true,
      updatedAt: true,
    },
  })
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    bodyExcerpt: bodyExcerpt(r.body),
    active: r.active,
    noIndex: r.noIndex,
    policyType: asPolicyType(r.policyType),
    updatedAt: r.updatedAt,
  }))
}

export async function getPolicy(id: string): Promise<PolicyFull | null> {
  await protectRoute("policies:view")
  const p = await prisma.policy.findUnique({ where: { id } })
  if (!p) return null
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    body: p.body,
    active: p.active,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    seoImage: p.seoImage,
    noIndex: p.noIndex,
    policyType: asPolicyType(p.policyType),
    updatedAt: p.updatedAt,
  }
}

export async function createPolicy(input: {
  slug: string
  title: string
  body?: string
  policyType?: PolicyType | null
  seoTitle?: string
  seoDescription?: string
  seoImage?: string
  noIndex?: boolean
}): Promise<{ id: string }> {
  const userId = await protectRoute("policies:create")
  if (!input.title.trim()) throw new Error("El título es obligatorio")

  const slug = normalizeSlug(input.slug)
  if (!slug) throw new Error("El slug es obligatorio")

  const exists = await prisma.policy.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (exists) {
    throw new Error(`Ya existe una política con el slug "${slug}".`)
  }

  const p = await prisma.policy.create({
    data: {
      slug,
      title: input.title.trim(),
      body: input.body ?? "",
      policyType: input.policyType ?? null,
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      seoImage: input.seoImage?.trim() || null,
      noIndex: input.noIndex ?? false,
      createdBy: userId,
    },
  })
  updateTag(`policy:${slug}`)
  revalidatePath("/admin/politicas")
  return { id: p.id }
}

export async function updatePolicy(
  id: string,
  input: {
    slug?: string
    title?: string
    body?: string
    policyType?: PolicyType | null
    seoTitle?: string | null
    seoDescription?: string | null
    seoImage?: string | null
    noIndex?: boolean
    active?: boolean
  },
): Promise<void> {
  await protectRoute("policies:update")

  let nextSlug: string | undefined
  if (input.slug !== undefined) {
    nextSlug = normalizeSlug(input.slug)
    if (!nextSlug) throw new Error("El slug es obligatorio")
    const existing = await prisma.policy.findUnique({
      where: { slug: nextSlug },
      select: { id: true },
    })
    if (existing && existing.id !== id) {
      throw new Error(`Ya existe otra política con el slug "${nextSlug}".`)
    }
  }

  const previous = await prisma.policy.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!previous) throw new Error("Política no encontrada")

  await prisma.policy.update({
    where: { id },
    data: {
      ...(nextSlug !== undefined && { slug: nextSlug }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.policyType !== undefined && { policyType: input.policyType }),
      ...(input.seoTitle !== undefined && {
        seoTitle: input.seoTitle?.trim() || null,
      }),
      ...(input.seoDescription !== undefined && {
        seoDescription: input.seoDescription?.trim() || null,
      }),
      ...(input.seoImage !== undefined && {
        seoImage: input.seoImage?.trim() || null,
      }),
      ...(input.noIndex !== undefined && { noIndex: input.noIndex }),
      ...(input.active !== undefined && { active: input.active }),
    },
  })

  updateTag(`policy:${previous.slug}`)
  if (nextSlug && nextSlug !== previous.slug) updateTag(`policy:${nextSlug}`)
  revalidatePath("/admin/politicas")
  revalidatePath(`/admin/politicas/${id}`)
}

export async function togglePolicyActive(id: string): Promise<void> {
  await protectRoute("policies:update")
  const p = await prisma.policy.findUnique({
    where: { id },
    select: { active: true, slug: true },
  })
  if (!p) throw new Error("Política no encontrada")
  await prisma.policy.update({
    where: { id },
    data: { active: !p.active },
  })
  updateTag(`policy:${p.slug}`)
  revalidatePath("/admin/politicas")
}

export async function deletePolicy(id: string): Promise<void> {
  await protectRoute("policies:delete")
  const p = await prisma.policy.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!p) return
  await prisma.policy.delete({ where: { id } })
  updateTag(`policy:${p.slug}`)
  revalidatePath("/admin/politicas")
}
