export default function AdminLoading() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
