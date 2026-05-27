import { Check, X } from "lucide-react";
import type { ComparisonBlockContent, ComparisonRow } from "@/lib/types/landing-blocks";
import { cn } from "@/lib/utils";
import { readContent, readStyleAndMedia } from "./_normalizeContent";
import { applyBlockStyle } from "@/lib/blocks/apply-style";

interface ComparisonBlockProps {
  content: ComparisonBlockContent | unknown;
}

// Default colors are inlined in each descendant's `var(name, fallback)`
// declaration (e.g. `var(--block-accent, #dc2626)`) so the renderer doesn't
// bake them into the wrapper. If we set the var at SSR with a default, the
// customizer live-preview hook's `applyContentVars` removes it whenever
// the store field is empty — wiping the descendants' color source. Letting
// CSS handle the fallback keeps both surfaces (customizer + storefront)
// painted correctly without coordination.

export default function ComparisonBlock({ content: rawContent }: ComparisonBlockProps) {
  const content = readContent<ComparisonBlockContent>(rawContent, "COMPARISON");
  const { style: blockStyle } = readStyleAndMedia(rawContent);
  const { className: styleClass, style: inlineStyle } = applyBlockStyle(blockStyle);

  const rows = content.rows ?? [];
  if (rows.length === 0 && !content.title) return null;

  const othersLabel = content.othersLabel || "Otros";
  const yoursLabel = content.yoursLabel ?? "";

  // Expose the semantic colors as CSS custom properties on the section.
  // Descendants reference them via `var(--block-accent, fallback)` so the
  // customizer live-preview hook can swap them with one style.setProperty()
  // call. See `liveContentVars` in registry + the apply loop in
  // useLivePreviewOverrides.ts.
  //
  // IMPORTANT: every var is set only when the admin actually picked a
  // value. The hook's `applyContentVars` REMOVES vars whose source field
  // is empty, so if we set defaults here at SSR the hook would wipe them
  // and descendants would lose all color. The fallback hex codes live in
  // each descendant's `var(name, fallback)` declaration instead.
  const sectionStyle: React.CSSProperties = { ...inlineStyle };
  const optionalVars: Array<[string, string | undefined]> = [
    ["--block-accent", content.accentColor],
    ["--block-accent-text", content.accentTextColor],
    ["--block-yours-label", content.yoursLabelColor],
    ["--block-others-bg", content.othersBackgroundColor],
    ["--block-others-text", content.othersTextColor],
    ["--block-check", content.checkColor],
    ["--block-cross", content.crossColor],
  ];
  for (const [name, value] of optionalVars) {
    if (value) (sectionStyle as Record<string, string>)[name] = value;
  }

  return (
    <section
      className={cn("landing-section py-10 @md:py-16 @container", styleClass)}
      style={sectionStyle}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-8 @md:gap-10 @3xl:gap-16 items-center">
          {/* ─── Left column: heading + copy ─────────────────────────── */}
          <div className="text-center @3xl:text-left">
            <h2
              data-content-field="title"
              className="text-3xl @md:text-4xl @3xl:text-5xl font-extrabold tracking-tight uppercase leading-tight"
            >
              {content.title}
            </h2>
            {content.description && (
              <p
                data-content-field="description"
                className="mt-4 @md:mt-6 text-sm @md:text-base text-muted-foreground max-w-md mx-auto @3xl:mx-0"
              >
                {content.description}
              </p>
            )}
          </div>

          {/* ─── Right column: comparison table ──────────────────────── */}
          <ComparisonTable
            rows={rows}
            othersLabel={othersLabel}
            yoursLabel={yoursLabel}
          />
        </div>
      </div>
    </section>
  );
}

function ComparisonTable({
  rows,
  othersLabel,
  yoursLabel,
}: {
  rows: ComparisonRow[];
  othersLabel: string;
  yoursLabel: string;
}) {
  // Three-column grid: feature label | yours | others.
  // The accent column extends top→bottom as one continuous red surface; the
  // others column has its own header cell so the "Others" label sits above
  // the marks. Visual rounding lives on the outer wrapper to keep the inner
  // grid lines crisp without per-cell corner math.
  return (
    <div className="relative w-full">
      <div
        className={cn(
          "grid",
          // 1 col for the label, then 2 narrow cols for marks. The label
          // column flexes to fill remaining width.
          "grid-cols-[minmax(0,1fr)_minmax(64px,88px)_minmax(64px,88px)]",
          // Soft outer shadow + rounded corners matching the reference.
          "rounded-2xl overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]",
          // Card sits at top of stacked layout on mobile.
          "w-full max-w-xl mx-auto @3xl:max-w-none",
        )}
        // Card bg shows through the "others" mark cells (the only cells
        // without per-cell bg). Picking a custom `othersBackgroundColor`
        // therefore tints that column without further per-cell wiring.
        style={{ backgroundColor: "var(--block-others-bg, white)" }}
      >
        {/* ─── Header row ─────────────────────────────────────────── */}
        {/* Accent header spans the label column + the yours column so the
            top-left placeholder cell disappears — the accent surface flows
            edge-to-edge until the OTROS column. The label text uses its
            own var so the admin can tint just this string without
            touching the rest of the accent-column text color. */}
        <div
          data-content-field="yoursLabel"
          className="flex items-center justify-center text-[11px] @md:text-xs font-bold uppercase tracking-wider px-2 py-3"
          style={{
            backgroundColor: "var(--block-accent, #dc2626)",
            color: "var(--block-yours-label, var(--block-accent-text, #ffffff))",
            gridColumn: "1 / span 2",
          }}
        >
          {yoursLabel}
        </div>
        <div
          data-content-field="othersLabel"
          className="flex items-center justify-center text-[11px] @md:text-xs font-bold uppercase tracking-wider px-2 py-3"
          style={{
            backgroundColor: "var(--block-others-bg, white)",
            color: "var(--block-others-text, var(--foreground))",
          }}
        >
          {othersLabel}
        </div>

        {/* ─── Data rows ──────────────────────────────────────────── */}
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          return (
            <div key={row.id} className="contents">
              {/* Label cell — red bg with white text, matching the ref. */}
              <div
                className={cn(
                  "flex items-center px-4 @md:px-5 py-3.5 @md:py-4",
                  "text-[11px] @md:text-xs font-bold uppercase tracking-wider",
                  // Internal divider between rows on the label column.
                  !isLast && "border-b border-white/20",
                )}
                style={{
                  backgroundColor: "var(--block-accent, #dc2626)",
                  color: "var(--block-accent-text, #ffffff)",
                }}
              >
                <span className="line-clamp-2">{row.label}</span>
              </div>

              {/* Yours mark — same red surface as the label. */}
              <Mark ok={row.yours} surface="accent" divider={!isLast} />

              {/* Others mark — white surface with subtle divider lines. */}
              <Mark ok={row.theirs} surface="white" divider={!isLast} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Mark({
  ok,
  surface,
  divider,
}: {
  ok: boolean;
  surface: "accent" | "white";
  divider: boolean;
}) {
  const onAccent = surface === "accent";
  const Icon = ok ? Check : X;
  // Icon color: ✓ uses the admin's `checkColor` if set, otherwise falls
  // back to a per-surface green (lighter on red, darker on white). ✗ on
  // the accent surface inherits from currentColor (= accentTextColor);
  // ✗ on the white surface uses the admin's `crossColor` or slate-900.
  const iconColor = ok
    ? onAccent
      ? "var(--block-check, #22c55e)" // green-500: pops on red
      : "var(--block-check, #16a34a)" // green-600: contrasts on white
    : onAccent
      ? "currentColor"
      : "var(--block-cross, #0f172a)";

  return (
    <div
      className={cn(
        "flex items-center justify-center py-3.5 @md:py-4",
        !onAccent && divider && "border-b border-slate-100",
        onAccent && divider && "border-b border-white/20",
      )}
      style={
        onAccent
          ? {
              backgroundColor: "var(--block-accent, #dc2626)",
              color: "var(--block-accent-text, #ffffff)",
            }
          : undefined
      }
      aria-label={ok ? "Sí" : "No"}
    >
      <Icon
        className="h-5 w-5 @md:h-6 @md:w-6"
        strokeWidth={3}
        style={{ color: iconColor }}
      />
    </div>
  );
}
