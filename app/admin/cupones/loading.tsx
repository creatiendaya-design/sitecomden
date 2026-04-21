export default function CuponesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="rounded-xl border bg-white p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
              <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
