"use client";

import dynamic from "next/dynamic";
import { FeatureGuard } from "@/components/auth/FeatureGuard";

/**
 * NetworkChat is a large client component (~840 lines + WebSocket/WebRTC).
 * Dynamic import with ssr:false lets the page shell render instantly while
 * the heavy component chunk loads in the background.
 */
const NetworkChat = dynamic(
  () => import("@/components/features/NetworkChat").then((m) => ({ default: m.NetworkChat })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse card flex h-[calc(100vh-200px)] min-h-[520px] overflow-hidden">
        <aside className="w-64 shrink-0 border-r border-gray-100 p-3 space-y-3">
          <div className="h-8 w-full rounded-xl bg-gray-100" />
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
        <div className="flex flex-1 flex-col">
          <div className="border-b border-gray-100 h-14 px-4 flex items-center">
            <div className="h-4 w-40 rounded bg-gray-200" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 ? "justify-end" : ""}`}>
                {!(i % 2) && <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />}
                <div className="h-10 w-48 rounded-2xl bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 p-3">
            <div className="h-10 rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    ),
  }
);

export default function DiscussionPage() {
  return (
    <FeatureGuard feature="discussion">
      <NetworkChat />
    </FeatureGuard>
  );
}
