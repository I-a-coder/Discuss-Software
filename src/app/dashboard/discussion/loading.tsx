/** Discussion page skeleton — matches the 2-pane chat layout */
export default function DiscussionLoading() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-xl bg-gray-200" />
          <div className="h-3.5 w-64 rounded bg-gray-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-gray-200" />
          <div className="h-9 w-28 rounded-xl bg-gray-100" />
        </div>
      </div>
      {/* Chat card: sidebar + messages pane */}
      <div className="card flex h-[calc(100vh-200px)] min-h-[520px] overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-64 shrink-0 border-r border-gray-100 flex flex-col gap-3 p-3">
          <div className="h-8 w-full rounded-xl bg-gray-100" />
          <div className="flex gap-1">
            <div className="h-7 w-16 rounded-full bg-gray-100" />
            <div className="h-7 w-20 rounded-full bg-gray-100" />
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded bg-gray-200" style={{ width: `${55 + i * 7}%` }} />
                <div className="h-2.5 rounded bg-gray-100" style={{ width: `${40 + i * 5}%` }} />
              </div>
            </div>
          ))}
        </aside>
        {/* Messages pane */}
        <div className="flex flex-1 flex-col">
          <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-3 w-20 rounded bg-gray-100" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded-xl bg-gray-100" />
              <div className="h-8 w-16 rounded-xl bg-gray-100" />
            </div>
          </div>
          <div className="flex-1 p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "justify-end"}`}>
                {i % 2 === 0 && <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />}
                <div className={`space-y-1.5 max-w-xs ${i % 2 === 0 ? "" : "items-end flex flex-col"}`}>
                  <div className="h-3 w-16 rounded bg-gray-100" />
                  <div className={`h-10 rounded-2xl bg-gray-${i % 2 === 0 ? "100" : "200"}`}
                    style={{ width: `${120 + i * 20}px` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 p-3">
            <div className="h-10 rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
