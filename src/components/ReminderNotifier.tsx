"use client";

import { useEffect } from "react";

/** Polls calendar reminders app-wide */
export function ReminderNotifier() {
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/calendar/reminders");
        if (!res.ok) return;
        const due = await res.json();
        if (
          due.length > 0 &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          due.forEach((e: { title: string; stickyNote?: string }) => {
            new Notification(`Reminder: ${e.title}`, {
              body: e.stickyNote || "From your Yusi Discuss calendar",
            });
          });
        }
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  return null;
}
