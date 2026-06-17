/** Shared skeleton shown instantly during any dashboard page transition */
export default function PageLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Page header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-xl bg-gray-200" />
          <div className="h-3.5 w-72 max-w-full rounded bg-gray-100" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-gray-200" />
      </div>
      {/* Content area skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 rounded-2xl bg-gray-100" />
        <div className="h-36 rounded-2xl bg-gray-100" />
      </div>
      <div className="h-72 rounded-2xl bg-gray-100" />
    </div>
  );
}
