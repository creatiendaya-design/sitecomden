export default function ProductosLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200" />
      </div>

      <div className="h-16 animate-pulse rounded-xl bg-slate-200" />

      <div className="rounded-xl border bg-white p-4 sm:p-6 space-y-4">
        <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded-md bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
