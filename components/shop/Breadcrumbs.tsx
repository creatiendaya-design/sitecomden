import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbEntry {
  name: string;
  /** Absolute or root-relative URL. The last entry is rendered as plain text. */
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbEntry[];
  className?: string;
}

/**
 * Visual breadcrumb navigation for the storefront. Mirrors the data fed to
 * `buildBreadcrumbList` (JSON-LD) so the on-page trail and the structured data
 * stay in sync. The last item is the current page (not a link).
 *
 * Server component — no client state needed.
 */
export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Migas de pan" className={cn("w-full", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="line-clamp-1 font-medium text-foreground"
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="line-clamp-1 transition-colors hover:text-foreground"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
