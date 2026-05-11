export default function DashboardLoading() {
  return (
    <div className="space-y-4 sm:space-y-8 p-4 sm:p-0">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <div className="h-7 sm:h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="hidden sm:block h-9 w-40 animate-pulse rounded-lg bg-slate-200" />
      </div>

      {/* Stats: 2 cols mobile, 4 cols desktop */}
      <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 sm:h-32 animate-pulse rounded-xl bg-slate-200"
          />
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
        <div className="h-72 sm:h-80 animate-pulse rounded-xl bg-slate-200 lg:col-span-4" />
        <div className="h-72 sm:h-80 animate-pulse rounded-xl bg-slate-200 lg:col-span-3" />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="h-56 sm:h-64 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-56 sm:h-64 animate-pulse rounded-xl bg-slate-200" />
      </div>

      <div className="h-80 sm:h-96 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
