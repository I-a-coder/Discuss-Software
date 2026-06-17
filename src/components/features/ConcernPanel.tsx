"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Bug,
  MessageSquareWarning,
  Lightbulb,
  CheckCircle,
} from "lucide-react";
import { canPerform, type UserRole } from "@/lib/permissions";
import { PageHeader } from "./PageHeader";
import { useLabels } from "@/hooks/useLabels";

type Report = {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  user: { name: string | null; email: string };
};

const CATEGORY_IDS = [
  { id: "feedback", labelKey: "concerns.cat_feedback" as const, icon: Lightbulb },
  { id: "technical", labelKey: "concerns.cat_technical" as const, icon: Bug },
  { id: "concern", labelKey: "concerns.cat_concern" as const, icon: AlertTriangle },
  { id: "other", labelKey: "concerns.cat_other" as const, icon: MessageSquareWarning },
];

export function ConcernPanel() {
  const { data: session } = useSession();
  const { t, feature } = useLabels();
  const role = (session?.user?.role || "GUEST") as UserRole;
  const isAuthority = canPerform(role, "viewConcerns");

  const [reports, setReports] = useState<Report[]>([]);
  const [category, setCategory] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);

  async function load() {
    const res = await fetch("/api/concerns");
    if (res.ok) setReports(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/concerns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, subject, description }),
    });
    if (res.ok) {
      setSent(true);
      setSubject("");
      setDescription("");
      load();
      setTimeout(() => setSent(false), 4000);
    }
  }

  async function resolve(id: string) {
    await fetch("/api/concerns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "resolved" }),
    });
    load();
  }

  return (
    <div>
      <PageHeader
        title={feature("concerns")}
        description={t("concerns.desc")}
        help={t("concerns.help")}
      />

      {sent && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" /> {t("concerns.thank_you")}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submit} className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{t("concerns.submit_report")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_IDS.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    category === c.id
                      ? "border-[#5D3A8C] bg-[#F3EEF8] text-[#5D3A8C]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(c.labelKey)}
                </button>
              );
            })}
          </div>
          <input
            className="input-field"
            placeholder={t("concerns.subject_placeholder")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <textarea
            className="input-field min-h-[140px]"
            placeholder={t("concerns.describe_placeholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary w-full">
            {t("concerns.submit_btn")}
          </button>
        </form>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {isAuthority ? t("concerns.all_reports") : t("concerns.your_submissions")}
          </h3>
          <ul className="space-y-3 max-h-[480px] overflow-y-auto">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-gray-100 p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{r.subject}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      r.status === "open"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {r.status === "open" ? t("concerns.status_open") : t("concerns.status_resolved")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  {r.category} · {isAuthority && (r.user.name || r.user.email)} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{r.description}</p>
                {isAuthority && r.status === "open" && (
                  <button
                    type="button"
                    onClick={() => resolve(r.id)}
                    className="mt-2 text-xs text-[#5D3A8C] underline"
                  >
                    {t("concerns.mark_resolved")}
                  </button>
                )}
              </li>
            ))}
            {reports.length === 0 && (
              <p className="text-gray-500 text-center py-8">{t("concerns.no_reports")}</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
