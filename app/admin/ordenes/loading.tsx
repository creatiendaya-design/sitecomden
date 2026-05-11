export default function OrdenesLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 sm:h-8 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
      </div>

      {/* Filters panel */}
      <div className="h-16 animate-pulse rounded-xl bg-slate-200" />

      {/* Filter tabs */}
      <div className="flex gap-2">
        <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
      </div>

      {/* List */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        </div>

        {/* Mobile skeleton */}
        <ul className="divide-y md:hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-14 animate-pulse rounded-full bg-slate-200" />
                </div>
                <div className="h-3 w-44 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-14 animate-pulse rounded bg-slate-200" />
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <div className="bg-muted/30 border-b px-4 py-2.5 flex gap-4">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-300" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-300" />
            <div className="h-3 w-16 animate-pulse rounded bg-slate-300" />
            <div className="ml-auto h-3 w-12 animate-pulse rounded bg-slate-300" />
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b last:border-0 px-4 py-3">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
