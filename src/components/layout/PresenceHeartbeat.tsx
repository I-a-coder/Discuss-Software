"use client";

import { usePresenceHeartbeat } from "@/hooks/usePresence";

export function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}
