"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export interface MegaPanelContent {
  trigger?: string
  featuredImage?: string
  featuredImageHref?: string
  links?: Array<{ label: string; href: string; openInNewTab?: boolean }>
}

/**
 * Single hover-triggered panel inside a MEGA_MENU section. Lives in its
 * own client module so the surrounding MegaMenu / ThemeSectionRenderer
 * stay server-rendered.
 *
 * Storefront perf: panel links are inside `hidden group-hover:flex`, so
 * Next's viewport prefetcher never sees them and every click would
 * cold-load the destination. On first hover/focus we warm the router
 * cache for all internal links + the featured image's href.
 */
export function MegaPanel({
  blockId,
  panel,
}: {
  blockId: string
  panel: MegaPanelContent
}) {
  const router = useRouter()
  const prefetchedRef = useRef(false)

  const prefetchPanel = () => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    if (
      panel.featuredImageHref &&
      !panel.featuredImageHref.startsWith("http")
    ) {
      router.prefetch(panel.featuredImageHref)
    }
    for (const link of panel.links ?? []) {
      if (link.openInNewTab) continue
      if (!link.href || link.href.startsWith("http")) continue
      router.prefetch(link.href)
    }
  }

  return (
    <div
      className="group relative py-3"
      data-preview-target={`subblock:${blockId}`}
      onMouseEnter={prefetchPanel}
      onFocus={prefetchPanel}
    >
      <button className="text-sm font-medium hover:text-primary">
        <span data-content-field="trigger">{panel.trigger ?? "Menú"}</span>
      </button>
      <div className="absolute left-0 top-full hidden group-hover:flex gap-6 bg-background border shadow-lg p-6 min-w-[400px] z-50">
        {panel.featuredImage && (
          <Link
            href={panel.featuredImageHref ?? "#"}
            prefetch={true}
            className="shrink-0"
          >
            <Image
              src={panel.featuredImage}
              alt=""
              width={160}
              height={120}
              className="rounded object-cover"
            />
          </Link>
        )}
        <ul className="space-y-2 text-sm">
          {(panel.links ?? []).map((link, i) => (
            <li
              key={i}
              data-content-array="links"
              data-content-index={i}
            >
              <Link
                href={link.href}
                target={link.openInNewTab ? "_blank" : undefined}
                rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                prefetch={link.openInNewTab ? undefined : true}
                className="hover:text-primary"
              >
                <span data-content-field="label">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
