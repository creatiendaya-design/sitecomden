export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-200" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="h-80 animate-pulse rounded-xl bg-slate-200 lg:col-span-4" />
        <div className="h-80 animate-pulse rounded-xl bg-slate-200 lg:col-span-3" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      </div>

      <div className="h-96 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
