"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Calendar, Plus, StickyNote, Trash2 } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { CalendarColorPicker } from "@/components/ui/CalendarColorPicker";
import { useLanguage } from "@/contexts/LanguageContext";

type CalEvent = {
  id: string;
  title: string;
  eventDate: string;
  stickyNote: string | null;
  color: string;
  remindAt: string | null;
};

export function CalendarPanel() {
  const { t } = useLanguage();
  const now = new Date();
  const DAY_LABELS = [
    t("calendar.day_sun"),
    t("calendar.day_mon"),
    t("calendar.day_tue"),
    t("calendar.day_wed"),
    t("calendar.day_thu"),
    t("calendar.day_fri"),
    t("calendar.day_sat"),
  ];
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [stickyNote, setStickyNote] = useState("");
  const [color, setColor] = useState("#FEF3C7");
  const [remindAt, setRemindAt] = useState("");
  const [notifications, setNotifications] = useState<CalEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSticky, setEditSticky] = useState("");
  const [editColor, setEditColor] = useState("#FEF3C7");
  const [editRemind, setEditRemind] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/calendar?month=${month}`);
    if (res.ok) setEvents(await res.json());
  }, [month]);

  const checkReminders = useCallback(async () => {
    const res = await fetch("/api/calendar/reminders");
    if (res.ok) {
      const due = await res.json();
      if (due.length > 0) {
        setNotifications((n) => [...due, ...n].slice(0, 5));
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            due.forEach((e: CalEvent) => {
              new Notification(`${t("calendar.reminder_prefix")}: ${e.title}`, {
                body: e.stickyNote || t("calendar.reminder_body"),
              });
            });
          }
        }
      }
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    checkReminders();
    const t = setInterval(checkReminders, 60000);
    return () => clearInterval(t);
  }, [checkReminders]);

  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function eventsOnDay(day: number) {
    return events.filter((e) => {
      const d = new Date(e.eventDate);
      return d.getDate() === day && d.getMonth() === m - 1 && d.getFullYear() === y;
    });
  }

  async function save() {
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        eventDate: date,
        stickyNote,
        color,
        remindAt: remindAt || null,
      }),
    });
    setShowForm(false);
    setTitle("");
    setDate("");
    setStickyNote("");
    setRemindAt("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
    setSelected(null);
    setEditing(false);
    load();
  }

  function startEdit(e: CalEvent) {
    setEditing(true);
    setEditTitle(e.title);
    setEditSticky(e.stickyNote || "");
    setEditColor(e.color);
    setEditRemind(
      e.remindAt
        ? new Date(e.remindAt).toISOString().slice(0, 16)
        : ""
    );
  }

  async function saveEdit() {
    if (!selected) return;
    const res = await fetch("/api/calendar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        title: editTitle,
        stickyNote: editSticky,
        color: editColor,
        remindAt: editRemind || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      setEditing(false);
      load();
    }
  }

  return (
    <div>
      <PageHeader
        title={t("calendar.title")}
        description={t("calendar.desc")}
        help={t("calendar.help")}
        action={
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> {t("calendar.add_date")}
          </button>
        }
      />

      {notifications.length > 0 && (
        <div className="mb-4 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm"
            >
              <Bell className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <strong>{n.title}</strong>
                {n.stickyNote && <p className="text-gray-600">{n.stickyNote}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="btn-secondary text-xs py-1.5"
              onClick={() => {
                const d = new Date(y, m - 2, 1);
                setMonth(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                );
              }}
            >
              ←
            </button>
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#5D3A8C]" />
              {new Date(y, m - 1).toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              type="button"
              className="btn-secondary text-xs py-1.5"
              onClick={() => {
                const d = new Date(y, m, 1);
                setMonth(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                );
              }}
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
            {DAY_LABELS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                disabled={!day}
                onClick={() => {
                  if (!day) return;
                  const dayEvents = eventsOnDay(day);
                  if (dayEvents[0]) setSelected(dayEvents[0]);
                }}
                className={`min-h-[72px] rounded-xl border p-1 text-left transition ${
                  day
                    ? "border-gray-100 hover:border-[#5D3A8C]/40 bg-white"
                    : "border-transparent"
                }`}
              >
                {day && (
                  <>
                    <span className="text-sm font-medium text-gray-700">{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {eventsOnDay(day)
                        .slice(0, 2)
                        .map((e) => (
                          <span
                            key={e.id}
                            className="block truncate rounded px-1 py-0.5 text-[10px]"
                            style={{ backgroundColor: e.color }}
                          >
                            {e.title}
                          </span>
                        ))}
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <div
              className="sticky-note rounded-2xl border-l-4 p-5 shadow-md"
              style={{ borderColor: selected.color, backgroundColor: selected.color }}
            >
              {editing ? (
                <div className="space-y-3">
                  <input
                    className="input-field text-sm"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <textarea
                    className="input-field min-h-[100px] text-sm"
                    value={editSticky}
                    onChange={(e) => setEditSticky(e.target.value)}
                    placeholder={t("calendar.sticky_note")}
                  />
                  <CalendarColorPicker color={editColor} onChange={setEditColor} />
                  <input
                    type="datetime-local"
                    className="input-field text-sm"
                    value={editRemind}
                    onChange={(e) => setEditRemind(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEdit} className="btn-primary text-xs flex-1">
                      {t("general.save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="btn-secondary text-xs"
                    >
                      {t("general.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-gray-900">{selected.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selected.eventDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {selected.remindAt && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-[#5D3A8C]">
                      <Bell className="h-3 w-3" />
                      {t("calendar.reminder_prefix")}: {new Date(selected.remindAt).toLocaleString()}
                    </p>
                  )}
                  {selected.stickyNote ? (
                    <p className="mt-3 text-sm text-gray-800 whitespace-pre-wrap flex gap-2">
                      <StickyNote className="h-4 w-4 shrink-0 mt-0.5" />
                      {selected.stickyNote}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500 italic">{t("calendar.sticky_note")}</p>
                  )}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(selected)}
                      className="text-xs text-[#5D3A8C] font-medium hover:underline"
                    >
                      {t("calendar.edit_event")}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(selected.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> {t("calendar.delete_event")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="card p-5 text-sm text-gray-500 text-center">
              {t("calendar.select_day")}
            </div>
          )}
          <div className="card p-4">
            <h4 className="text-sm font-semibold mb-2">{t("calendar.today")}</h4>
            <ul className="space-y-2 text-sm">
              {events.slice(0, 5).map((e) => (
                <li
                  key={e.id}
                  className="cursor-pointer hover:text-[#5D3A8C]"
                  onClick={() => setSelected(e)}
                >
                  {e.title} · {new Date(e.eventDate).toLocaleDateString()}
                </li>
              ))}
              {events.length === 0 && (
                <li className="text-gray-400">{t("calendar.no_events")}</li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 my-4">
            <h3 className="font-semibold">{t("calendar.new_event")}</h3>
            <input
              className="input-field"
              placeholder={t("calendar.event_title")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="datetime-local"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <textarea
              className="input-field min-h-[80px]"
              placeholder={t("calendar.sticky_note")}
              value={stickyNote}
              onChange={(e) => setStickyNote(e.target.value)}
            />
            <div>
              <p className="text-xs text-gray-500 mb-1">{t("calendar.sticky_note")}</p>
              <CalendarColorPicker color={color} onChange={setColor} />
            </div>
            <input
              type="datetime-local"
              className="input-field"
              placeholder={t("calendar.reminder")}
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Bell className="h-3 w-3" /> {t("calendar.help")}
            </p>
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary flex-1">
                {t("calendar.save_event")}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">
                {t("general.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
