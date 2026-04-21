export default function PagosPendientesLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-200" />
      <div className="rounded-xl border bg-white p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
            <div className="flex gap-2">
              <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
