"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, MessageCircle, Clock, Users, Pencil, Trash2, X,
  Calendar, AlignLeft, Palette, CheckCircle2, Check,
} from "lucide-react";
import { canPerform, type UserRole } from "@/lib/permissions";
import { PageHeader } from "./PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmojiPicker, insertEmojiAtCursor } from "@/components/ui/EmojiPicker";
import { useLanguage } from "@/contexts/LanguageContext";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type AssigneeUser = { id: string; name: string | null; email: string };

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  color: string;
  dueAt: string | null;
  assignees: { user: AssigneeUser }[];
  comments: { id: string; content: string; authorName: string }[];
};

type OrgUser = { id: string; name: string | null; email: string };

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const COLOR_KEYS = [
  { hex: "#FEF3C7", key: "board.color_yellow" as const },
  { hex: "#DBEAFE", key: "board.color_blue" as const },
  { hex: "#D1FAE5", key: "board.color_green" as const },
  { hex: "#FCE7F3", key: "board.color_pink" as const },
  { hex: "#E0E7FF", key: "board.color_indigo" as const },
  { hex: "#FEE2E2", key: "board.color_red" as const },
  { hex: "#F3F4F6", key: "board.color_gray" as const },
  { hex: "#FDF4FF", key: "board.color_purple" as const },
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  assigneeIds: [] as string[],
  dueAt: "",
  color: "#FEF3C7",
  status: "TODO",
};

type TaskForm = typeof DEFAULT_FORM;

/* ------------------------------------------------------------------ */
/* Avatar helpers                                                      */
/* ------------------------------------------------------------------ */
const AVATAR_COLORS = [
  "#5D3A8C", "#8B5CF6", "#3B82F6", "#10B981",
  "#F59E0B", "#EF4444", "#EC4899", "#06B6D4",
];

function getInitials(user: AssigneeUser) {
  if (user.name) {
    const parts = user.name.trim().split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarBubble({
  user,
  size = 24,
  style,
}: {
  user: AssigneeUser;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      title={user.name || user.email}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarColor(user.id),
        color: "#fff",
        fontSize: size * 0.38,
        fontWeight: 700,
        border: "2px solid #fff",
        flexShrink: 0,
        ...style,
      }}
    >
      {getInitials(user)}
    </span>
  );
}

function AvatarStack({ assignees }: { assignees: { user: AssigneeUser }[] }) {
  const max = 3;
  const visible = assignees.slice(0, max);
  const overflow = assignees.length - max;
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {visible.map((a, i) => (
        <AvatarBubble
          key={a.user.id}
          user={a.user}
          size={22}
          style={{ marginLeft: i === 0 ? 0 : -6, zIndex: max - i }}
        />
      ))}
      {overflow > 0 && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#E5E7EB",
            color: "#374151",
            fontSize: 9,
            fontWeight: 700,
            border: "2px solid #fff",
            marginLeft: -6,
          }}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Multi-select assignee picker                                        */
/* ------------------------------------------------------------------ */
function AssigneePicker({
  users,
  selectedIds,
  onChange,
  label,
}: {
  users: OrgUser[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label: string;
}) {
  const { td } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <Users className="h-4 w-4 text-[#5D3A8C]" />
        {label}
        {selectedIds.length > 0 && (
          <span
            style={{
              background: "#5D3A8C",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 20,
              padding: "1px 7px",
            }}
          >
            {selectedIds.length}
          </span>
        )}
      </label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-field text-left flex items-center gap-2 min-h-[38px]"
        style={{ cursor: "pointer", justifyContent: "space-between" }}
      >
        {selectedUsers.length === 0 ? (
          <span className="text-gray-400 text-sm">{td("Unassigned")}</span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AvatarStack assignees={selectedUsers.map((u) => ({ user: u }))} />
            <span className="text-sm text-gray-700 truncate">
              {selectedUsers.length === 1
                ? selectedUsers[0].name || selectedUsers[0].email
                : `${selectedUsers.length} ${td("assignees")}`}
            </span>
          </span>
        )}
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 100,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {/* Unassign-all */}
          <button
            type="button"
            onClick={() => onChange([])}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              fontSize: 13,
              color: "#6B7280",
              background: "none",
              border: "none",
              borderBottom: "1px solid #F3F4F6",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "1.5px dashed #D1D5DB",
                display: "inline-flex",
              }}
            />
            {td("Unassigned")}
          </button>

          {users.map((u) => {
            const selected = selectedIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 13,
                  background: selected ? "#F5F3FF" : "none",
                  border: "none",
                  borderBottom: "1px solid #F9FAFB",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <AvatarBubble user={u} size={26} />
                <span style={{ flex: 1, color: "#111827", fontWeight: selected ? 600 : 400 }}>
                  {u.name || u.email}
                </span>
                {selected && <Check className="h-3.5 w-3.5 text-[#5D3A8C]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Main Component                                                      */
/* ================================================================== */
export function ProjectBoard() {
  const { data: session } = useSession();
  const { t, td } = useLanguage();
  const role = (session?.user?.role || "GUEST") as UserRole;
  const canCreate = canPerform(role, "createTask");

  const COLUMNS = [
    { id: "TODO",        label: t("board.todo"),        variant: "info" as const },
    { id: "IN_PROGRESS", label: t("board.in_progress"), variant: "warning" as const },
    { id: "REVIEW",      label: t("board.review"),       variant: "default" as const },
    { id: "DONE",        label: t("board.done"),         variant: "success" as const },
  ];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [commentTask, setCommentTask] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const commentRef = useRef<HTMLInputElement>(null);

  /* ---- notification toast ---- */
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/chat/users?q=");
    if (res.ok) setOrgUsers(await res.json());
  }, []);

  useEffect(() => {
    load();
    loadUsers();
  }, [load, loadUsers]);

  /* ---- Modal helpers ---- */
  function openCreateModal() {
    setEditingTask(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assigneeIds: task.assignees.map((a) => a.user.id),
      dueAt: task.dueAt ? task.dueAt.slice(0, 10) : "",
      color: task.color,
      status: task.status,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTask(null);
    setForm(DEFAULT_FORM);
  }

  function setField<K extends keyof TaskForm>(key: K, val: TaskForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  /* ---- CRUD ---- */
  async function saveTask() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigneeIds: form.assigneeIds,
      dueAt: form.dueAt || null,
      color: form.color,
      status: form.status,
    };
    if (editingTask) {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTask.id, ...payload }),
      });
    } else {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    closeModal();
    await load();
    if (form.assigneeIds.length > 0) {
      showToast(
        `✉️ Assignment email${form.assigneeIds.length > 1 ? "s" : ""} sent to ${form.assigneeIds.length} assignee${form.assigneeIds.length > 1 ? "s" : ""}.`
      );
    }
  }

  async function deleteTask() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    setDeleting(false);
    setDeleteTarget(null);
    load();
  }

  async function moveTask(id: string, status: string) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function addComment(taskId: string) {
    if (!commentText.trim()) return;
    await fetch("/api/tasks/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, content: commentText }),
    });
    setCommentText("");
    setCommentTask(null);
    load();
  }

  function daysLeft(due: string | null) {
    if (!due) return null;
    const d = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
    if (d < 0) return { text: `${Math.abs(d)}d ${t("board.overdue")}`, variant: "danger" as const };
    if (d === 0) return { text: t("board.due_today"), variant: "warning" as const };
    return { text: `${d}d ${t("board.days_left")}`, variant: "info" as const };
  }

  return (
    <div>
      <PageHeader
        title={t("board.title")}
        description={t("board.desc")}
        help={t("board.help")}
        action={
          canCreate && (
            <button onClick={openCreateModal} className="btn-primary">
              <Plus className="h-4 w-4" /> {t("board.new_task")}
            </button>
          )
        }
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            background: "linear-gradient(135deg,#5D3A8C,#8B5CF6)",
            color: "#fff",
            borderRadius: 12,
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 6px 24px rgba(93,58,140,0.35)",
            zIndex: 9999,
            animation: "fadeInUp 0.3s ease",
          }}
        >
          {toast}
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="rounded-2xl bg-gray-100/80 p-3 min-h-[300px]">
            <div className="mb-3 flex items-center justify-between px-1">
              <Badge variant={col.variant}>{col.label}</Badge>
              <span className="text-xs text-gray-500">
                {tasks.filter((t) => t.status === col.id).length}
              </span>
            </div>
            <div className="space-y-3">
              {tasks
                .filter((t) => t.status === col.id)
                .map((task) => {
                  const due = daysLeft(task.dueAt);
                  const isAssignee = task.assignees.some((a) => a.user.id === session?.user?.id);
                  const canEditThis = canPerform(role, "editAnyTask") || isAssignee;
                  const canDelThis = canPerform(role, "deleteTask") || isAssignee;
                  return (
                    <div
                      key={task.id}
                      className="sticky-note border-l-[#5D3A8C] group relative"
                      style={{ backgroundColor: task.color }}
                    >
                      {/* Action buttons */}
                      {(canEditThis || canDelThis) && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEditThis && (
                            <button
                              onClick={() => openEditModal(task)}
                              className="rounded-lg p-1 bg-white/80 hover:bg-white text-gray-500 hover:text-[#5D3A8C] shadow-sm"
                              title={t("board.edit_task")}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                          {canDelThis && (
                            <button
                              onClick={() => setDeleteTarget(task)}
                              className="rounded-lg p-1 bg-white/80 hover:bg-white text-gray-500 hover:text-red-500 shadow-sm"
                              title={t("board.delete_task")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}

                      <h4 className="font-semibold text-gray-900 pr-14">{task.title}</h4>
                      {task.description && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 items-center">
                        {/* Avatar stack for assignees */}
                        {task.assignees.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <AvatarStack assignees={task.assignees} />
                            {task.assignees.length === 1 && (
                              <span className="text-xs text-gray-600">
                                {task.assignees[0].user.name ||
                                  task.assignees[0].user.email.split("@")[0]}
                              </span>
                            )}
                          </span>
                        )}
                        {due && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <Badge variant={due.variant}>{due.text}</Badge>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {task.comments.length}
                        </span>
                      </div>

                      {task.comments.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
                          {task.comments.slice(-2).map((c) => (
                            <p key={c.id} className="text-xs text-gray-700">
                              <strong>{c.authorName}:</strong> {c.content}
                            </p>
                          ))}
                        </div>
                      )}

                      {commentTask === task.id ? (
                        <div className="mt-2 flex gap-1 items-center">
                          <EmojiPicker
                            onInsert={(emoji) =>
                              setCommentText((t) =>
                                insertEmojiAtCursor(t, emoji, commentRef.current)
                              )
                            }
                          />
                          <input
                            ref={commentRef}
                            className="input-field text-xs py-1 flex-1"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={t("board.comment_placeholder")}
                          />
                          <button
                            onClick={() => addComment(task.id)}
                            className="text-xs text-[#5D3A8C] font-medium"
                          >
                            {t("general.send")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCommentTask(task.id)}
                          className="mt-2 text-xs text-[#5D3A8C] hover:underline"
                        >
                          + {t("board.add_comment")}
                        </button>
                      )}

                      {canCreate && (
                        <select
                          className="mt-2 w-full rounded-lg border border-gray-200 bg-white/80 px-2 py-1 text-xs"
                          value={task.status}
                          onChange={(e) => moveTask(task.id, e.target.value)}
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.id} value={c.id}>
                              → {c.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* ===== Create / Edit Modal ===== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-in">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#F3EEF8] to-white">
              <h3 className="font-semibold text-gray-900 text-lg">
                {editingTask ? t("board.edit_task") : t("board.new_task")}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-[#5D3A8C]" />
                  {t("board.task_title_placeholder")} <span className="text-red-400">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder={t("board.task_title_placeholder")}
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <AlignLeft className="h-4 w-4 text-[#5D3A8C]" />
                  {t("board.description")}
                </label>
                <textarea
                  className="input-field min-h-[90px] resize-y"
                  placeholder={t("board.comment_placeholder")}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>

              {/* Multi-Assignee picker */}
              <AssigneePicker
                users={orgUsers}
                selectedIds={form.assigneeIds}
                onChange={(ids) => setField("assigneeIds", ids)}
                label={t("board.assignee")}
              />

              {/* Email notice */}
              {form.assigneeIds.length > 0 && (
                <div
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {td(`✉️ An assignment email will be sent to ${form.assigneeIds.length} assignee${form.assigneeIds.length > 1 ? "s" : ""}.`)}
                </div>
              )}

              {/* Status */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-[#5D3A8C]" />
                  {t("board.status")}
                </label>
                <select
                  className="input-field"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4 text-[#5D3A8C]" />
                  {t("board.due_date")}
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={form.dueAt}
                  onChange={(e) => setField("dueAt", e.target.value)}
                />
              </div>

              {/* Color picker */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Palette className="h-4 w-4 text-[#5D3A8C]" aria-hidden />
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLOR_KEYS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={t(c.key)}
                      onClick={() => setField("color", c.hex)}
                      className={`h-8 w-8 rounded-xl border-2 transition-transform hover:scale-110 ${
                        form.color === c.hex
                          ? "border-[#5D3A8C] scale-110 shadow-md"
                          : "border-gray-200"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview swatch */}
              {form.title && (
                <div
                  className="rounded-xl border-l-4 border-[#5D3A8C] p-3 text-sm font-medium text-gray-800"
                  style={{ backgroundColor: form.color }}
                >
                  {form.title}
                  {form.description && (
                    <p className="mt-1 text-xs text-gray-500 font-normal line-clamp-1">
                      {form.description}
                    </p>
                  )}
                  {form.assigneeIds.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <AvatarStack
                        assignees={orgUsers
                          .filter((u) => form.assigneeIds.includes(u.id))
                          .map((u) => ({ user: u }))}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={saveTask}
                disabled={saving || !form.title.trim()}
                className="btn-primary flex-1"
              >
                {saving
                  ? t("general.loading")
                  : editingTask
                  ? t("board.save")
                  : t("board.new_task")}
              </button>
              <button onClick={closeModal} className="btn-secondary">
                {t("general.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirm Modal ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t("board.delete_task")}</h3>
                <p className="text-sm text-gray-500">{t("board.confirm_delete")}</p>
              </div>
            </div>
            <div
              className="rounded-xl border-l-4 border-red-300 p-3 text-sm"
              style={{ backgroundColor: deleteTarget.color }}
            >
              <strong>{deleteTarget.title}</strong>
              {deleteTarget.assignees.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <AvatarStack assignees={deleteTarget.assignees} />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={deleteTask}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting ? t("general.loading") : t("general.delete")}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
              >
                {t("general.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
