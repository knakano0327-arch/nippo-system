export default function EditReportLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="bg-muted h-8 w-32 rounded" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-muted h-10 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="bg-muted h-5 w-20 rounded" />
          <div className="bg-muted h-8 w-8 rounded" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-muted h-10 rounded" />
          <div className="bg-muted h-20 rounded" />
        </div>
      </div>
      <div className="bg-muted h-32 rounded" />
      <div className="bg-muted h-32 rounded" />
      <div className="flex gap-3">
        <div className="bg-muted h-10 w-24 rounded" />
        <div className="bg-muted h-10 w-16 rounded" />
        <div className="bg-muted h-10 w-24 rounded" />
      </div>
    </div>
  );
}
