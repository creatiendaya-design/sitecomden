export default function DashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="h-8 sm:h-9 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-60 animate-pulse rounded bg-muted" />
        </div>
        <div className="hidden sm:block h-9 w-32 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Stats: 2 cols mobile, 4 cols desktop */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-4 sm:p-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
                <div className="h-7 sm:h-8 w-28 animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-10 w-10 sm:h-11 sm:w-11 animate-pulse rounded-xl bg-muted shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
        <div className="rounded-xl border border-border/50 bg-card lg:col-span-4">
          <div className="p-4 sm:p-6 pb-0 space-y-1">
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-[300px] p-4 sm:p-6">
            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card lg:col-span-3">
          <div className="p-4 sm:p-6 pb-0 space-y-1">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-[300px] p-4 sm:p-6">
            <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>

      {/* Products and Stock */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card">
            <div className="p-4 sm:p-6 pb-0 space-y-1">
              <div className="h-5 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
            </div>
            <div className="p-4 sm:p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 rounded-lg py-2">
                  <div className="h-8 w-8 animate-pulse rounded-lg bg-muted shrink-0" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-12 animate-pulse rounded-full bg-muted shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 sm:px-6 py-3.5 sm:py-4">
              <div className="hidden sm:block h-10 w-10 animate-pulse rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-56 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-muted shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
