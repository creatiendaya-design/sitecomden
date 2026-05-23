export default function ShopLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="mx-auto max-w-7xl px-4 py-12"
    >
      <span className="sr-only">Cargando…</span>
      <div className="space-y-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
