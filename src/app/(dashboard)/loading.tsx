export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="bg-muted h-8 w-48 rounded" />
      <div className="bg-muted h-4 w-full rounded" />
      <div className="bg-muted h-4 w-3/4 rounded" />
      <div className="bg-muted h-4 w-5/6 rounded" />
    </div>
  );
}
