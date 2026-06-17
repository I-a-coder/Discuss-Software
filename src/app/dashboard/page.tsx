"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  MessageSquare,
  PenTool,
  Bot,
  Kanban,
  FileText,
  History,
  StickyNote,
  Shield,
} from "lucide-react";
import { getAccessibleFeatures } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import type { Feature } from "@/lib/constants";
import { useLabels } from "@/hooks/useLabels";

const ICONS: Record<string, React.ElementType> = {
  discussion: MessageSquare,
  whiteboard: PenTool,
  ai_chat: Bot,
  project_board: Kanban,
  meeting_notes: FileText,
  history: History,
  personal_notes: StickyNote,
};

const PATHS: Record<string, string> = {
  discussion: "/dashboard/discussion",
  whiteboard: "/dashboard/whiteboard",
  ai_chat: "/dashboard/ai",
  project_board: "/dashboard/projects",
  meeting_notes: "/dashboard/meetings",
  history: "/dashboard/history",
  personal_notes: "/dashboard/notes",
};

export default function DashboardHome() {
  const { data: session } = useSession();
  const { t, feature, role } = useLabels();
  const userRole = (session?.user?.role || "GUEST") as UserRole;
  const features = getAccessibleFeatures(userRole).filter(
    (f) => f !== "dashboard" && f !== "settings" && f !== "encryption" && f !== "team"
  );
  const firstName = session?.user?.name?.split(" ")[0];
  const orgName = session?.user?.organizationName;

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-[#5D3A8C]"
          style={{ fontFamily: "var(--font-libre)" }}
        >
          {t("dashboard.hello")}, {firstName || t("dashboard.there")} 👋
        </h1>
        <p className="mt-1 text-gray-600">
          {t("dashboard.welcome")} {orgName || t("dashboard.your_workspace")}. {t("dashboard.pick_tool")}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-gray-500">{t("dashboard.your_role")}</p>
          <p className="text-lg font-semibold text-[#5D3A8C]">{role(userRole)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">{t("dashboard.organization")}</p>
          <p className="text-lg font-semibold truncate">
            {orgName || "—"}
          </p>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <Shield className="h-8 w-8 text-[#5D3A8C]" />
          <div>
            <p className="font-semibold text-gray-900">{t("dashboard.encrypted")}</p>
            <p className="text-xs text-gray-500">{t("dashboard.aes256")}</p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900">{t("dashboard.quick_access")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f: Feature) => {
          const Icon = ICONS[f] || MessageSquare;
          const href = PATHS[f];
          if (!href) return null;
          return (
            <Link
              key={f}
              href={href}
              className="card group flex items-start gap-4 p-5 transition hover:border-[#5D3A8C] hover:shadow-md"
            >
              <div className="rounded-xl bg-[#F3EEF8] p-3 group-hover:bg-[#5D3A8C]">
                <Icon className="h-6 w-6 text-[#5D3A8C] group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{feature(f)}</h3>
                <p className="mt-1 text-sm text-gray-500">{t("dashboard.open")}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 card p-6 bg-[#F3EEF8]/50">
        <h3 className="font-semibold text-[#5D3A8C]">{t("dashboard.new_title")}</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>
            <Link href="/dashboard/discussion" className="text-[#5D3A8C] underline">
              {t("dashboard.new_step1")}
            </Link>
          </li>
          <li>
            <Link href="/dashboard/projects" className="text-[#5D3A8C] underline">
              {t("dashboard.new_step2")}
            </Link>
          </li>
          <li>
            <Link href="/dashboard/ai" className="text-[#5D3A8C] underline">
              {t("dashboard.new_step3")}
            </Link>
          </li>
          <li>
            <Link href="/dashboard/notes" className="text-[#5D3A8C] underline">
              {t("dashboard.new_step4")}
            </Link>
          </li>
        </ol>
      </div>
    </div>
  );
}
