export default function OrdenesLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
      <div className="rounded-xl border bg-white p-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
