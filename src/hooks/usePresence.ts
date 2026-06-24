"use client";

import { useEffect, useState, useCallback } from "react";

export function usePresenceHeartbeat() {
  useEffect(() => {
    const ping = () => fetch("/api/presence", { method: "POST" }).catch(() => null);
    ping();
    const id = setInterval(ping, 20_000);
    return () => clearInterval(id);
  }, []);
}

export function useOnlineStatus(userIds: string[]) {
  const [online, setOnline] = useState<Set<string>>(new Set());
  const key = userIds.sort().join(",");

  const refresh = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch(`/api/presence?ids=${encodeURIComponent(key)}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setOnline(new Set(data.online || []));
        }
      }
    } catch (e) {
      console.warn("[usePresence] failed to fetch presence status:", e);
    }
  }, [key]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  return online;
}
