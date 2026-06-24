/** Meetings page skeleton — mirrors the tabbed meeting hub layout */
export default function MeetingsLoading() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-xl bg-gray-200" />
          <div className="h-3.5 w-72 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-gray-200" />
      </div>
      {/* Tab bar */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-xl bg-gray-100" />
        ))}
      </div>
      {/* Meeting cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-gray-200" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>
              <div className="h-6 w-16 rounded-full bg-gray-100" />
            </div>
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-xl bg-gray-100" />
              <div className="h-8 w-20 rounded-xl bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
