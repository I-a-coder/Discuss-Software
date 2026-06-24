"use client";

import { Sidebar } from "./Sidebar";
import { ReminderNotifier } from "@/components/ReminderNotifier";
import { AiAssistantWidget } from "@/components/features/AiAssistantWidget";
import { CallProvider } from "@/contexts/CallContext";
import { PresenceHeartbeat } from "./PresenceHeartbeat";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider>
      <PresenceHeartbeat />
      <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
        <ReminderNotifier />
        <Sidebar />
        <main className="relative z-0 min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-6 md:p-8">{children}</div>
        </main>
        <AiAssistantWidget />
      </div>
    </CallProvider>
  );
}
