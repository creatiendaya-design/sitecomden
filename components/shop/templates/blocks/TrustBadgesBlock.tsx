"use client";

import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface TrustBadge {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
}

interface TrustBadgesContent {
  badges: TrustBadge[];
  layout: "horizontal" | "vertical";
  columns: 2 | 3 | 4 | 5;
  iconSize: "sm" | "md" | "lg";
  iconStyle: "outline" | "solid";
}

interface TrustBadgesBlockProps {
  content: TrustBadgesContent | unknown;
}

const ICON_SIZE_CLASS = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" } as const;

const HORIZONTAL_COLS = {
  2: "grid-cols-2",
  3: "grid-cols-2 @md:grid-cols-3",
  4: "grid-cols-2 @md:grid-cols-4",
  5: "grid-cols-2 @md:grid-cols-3 @lg:grid-cols-5",
} as const;

export default function TrustBadgesBlock({ content: rawContent }: TrustBadgesBlockProps) {
  const content = readContent<TrustBadgesContent>(rawContent, "TRUST_BADGES");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const badges = content.badges ?? [];
  const layout = content.layout ?? "horizontal";
  const columns = content.columns ?? 4;
  const iconSize = content.iconSize ?? "md";

  if (badges.length === 0) return null;

  return (
    <section
      className={cn("landing-section py-8 @md:py-14 @container", styleClass)}
      style={inlineStyle}
    >
      <div className="container mx-auto px-4">
        {layout === "horizontal" ? (
          <div className={cn("grid gap-4 @md:gap-6", HORIZONTAL_COLS[columns])}>
            {badges.map((b) => (
              <HorizontalBadge key={b.id} badge={b} iconSize={iconSize} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {badges.map((b) => (
              <VerticalBadge key={b.id} badge={b} iconSize={iconSize} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ResolveIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  const Fallback = LucideIcons.HelpCircle;
  const Comp = Icon ?? Fallback;
  return <Comp className={className} />;
}

function HorizontalBadge({ badge, iconSize }: { badge: TrustBadge; iconSize: "sm" | "md" | "lg" }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 p-3 rounded-lg">
      <ResolveIcon name={badge.icon} className={cn(ICON_SIZE_CLASS[iconSize], "text-primary")} />
      <div>
        <div className="font-semibold text-sm @md:text-base">{badge.title}</div>
        {badge.subtitle && <div className="text-xs text-muted-foreground">{badge.subtitle}</div>}
      </div>
    </div>
  );
}

function VerticalBadge({ badge, iconSize }: { badge: TrustBadge; iconSize: "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-white">
      <ResolveIcon name={badge.icon} className={cn(ICON_SIZE_CLASS[iconSize], "text-primary shrink-0")} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{badge.title}</div>
        {badge.subtitle && <div className="text-xs text-muted-foreground">{badge.subtitle}</div>}
      </div>
    </div>
  );
}
