export default function ReportDetailLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="bg-muted h-8 w-24 rounded" />
        <div className="bg-muted h-6 w-16 rounded-full" />
      </div>

      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="bg-muted h-3 w-16 rounded" />
            <div className="bg-muted h-5 w-32 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-muted h-px w-full" />

      <div className="flex flex-col gap-3">
        <div className="bg-muted h-5 w-20 rounded" />
        <div className="bg-muted h-24 w-full rounded" />
      </div>

      <div className="bg-muted h-px w-full" />

      <div className="flex flex-col gap-2">
        <div className="bg-muted h-5 w-32 rounded" />
        <div className="bg-muted h-16 w-full rounded" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="bg-muted h-5 w-32 rounded" />
        <div className="bg-muted h-16 w-full rounded" />
      </div>

      <div className="bg-muted h-px w-full" />

      <div className="flex flex-col gap-3">
        <div className="bg-muted h-5 w-24 rounded" />
        <div className="bg-muted h-32 w-full rounded" />
      </div>

      <div className="flex gap-3">
        <div className="bg-muted h-10 w-32 rounded" />
        <div className="bg-muted h-10 w-20 rounded" />
      </div>
    </div>
  );
}
