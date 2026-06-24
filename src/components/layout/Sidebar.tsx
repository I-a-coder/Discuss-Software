"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import {
  LayoutDashboard, MessageSquare, PenTool, Bot, FileText, History,
  Kanban, StickyNote, Users, Settings, Shield, Lock, Calendar, AlertCircle,
} from "lucide-react";
import { FEATURE_LABELS, type Feature } from "@/lib/constants";
import { getAccessibleFeatures } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { BrandLogo } from "@/components/BrandLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import type { TranslationKey } from "@/lib/translations";

// AccountSwitcher uses localStorage — must be client-only
const AccountSwitcher = dynamic(
  () => import("./AccountSwitcher").then((m) => ({ default: m.AccountSwitcher })),
  { ssr: false, loading: () => <div className="h-12" /> }
);

// ── useSyncExternalStore-based isClient ────────────────────────────────────
// This is the React 18 canonical pattern for server/client branching.
// It returns `false` on the server and during the SSR snapshot,
// and `true` on the client — WITHOUT triggering a hydration mismatch,
// even in strict mode where useEffect fires before hydration is complete.
const noop = () => () => {};
function useIsClient(): boolean {
  return useSyncExternalStore(
    noop,          // subscribe: nothing to subscribe to
    () => true,    // client snapshot: always true
    () => false    // server snapshot: always false
  );
}

// ── Static maps (module-level — no SSR issues) ──────────────────────────────
const NAV_ICONS: Record<Feature, React.ElementType> = {
  dashboard: LayoutDashboard, discussion: MessageSquare, whiteboard: PenTool,
  ai_chat: Bot, meeting_notes: FileText, history: History,
  project_board: Kanban, personal_notes: StickyNote, team: Users,
  settings: Settings, encryption: Shield, calendar: Calendar, concerns: AlertCircle,
};

const NAV_PATHS: Record<Feature, string> = {
  dashboard: "/dashboard", discussion: "/dashboard/discussion",
  whiteboard: "/dashboard/whiteboard", ai_chat: "/dashboard/ai",
  meeting_notes: "/dashboard/meetings", history: "/dashboard/history",
  project_board: "/dashboard/projects", personal_notes: "/dashboard/notes",
  team: "/dashboard/team", settings: "/dashboard/settings",
  encryption: "/dashboard/security", calendar: "/dashboard/calendar",
  concerns: "/dashboard/concerns",
};

const NAV_LABEL_KEYS: Record<Feature, TranslationKey> = {
  dashboard: "nav.dashboard", discussion: "nav.discussion",
  whiteboard: "nav.whiteboard", ai_chat: "nav.ai_chat",
  meeting_notes: "nav.meeting_notes", history: "nav.history",
  project_board: "nav.project_board", personal_notes: "nav.personal_notes",
  team: "nav.team", settings: "nav.settings", encryption: "nav.security",
  calendar: "nav.calendar", concerns: "nav.concerns",
};

const NAV_ORDER: Partial<Record<Feature, number>> = {
  dashboard: 10, discussion: 20, meeting_notes: 30, ai_chat: 40,
  whiteboard: 50, project_board: 60, personal_notes: 70, history: 80,
  team: 90, calendar: 100, settings: 110,
};

// ── Skeleton — shown server-side and during the first client paint ──────────
function SidebarSkeleton() {
  return (
    <aside className="relative z-30 flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <div className="h-8 w-36 rounded-lg bg-gray-100 animate-pulse" />
        <div className="mt-2 h-3 w-28 rounded bg-gray-100 animate-pulse" />
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {[0,1,2,3,4,5,6].map((i) => (
          <div key={i} className="h-9 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </nav>
      <div className="border-t border-gray-100 p-3 space-y-2">
        <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
        <div className="h-9 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    </aside>
  );
}

export function Sidebar() {
  // useSyncExternalStore correctly signals to React:
  //   server → false, client → true
  // React handles the transition without a hydration error.
  const isClient = useIsClient();

  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();
  const role = (session?.user?.role || "GUEST") as UserRole;
  const features = getAccessibleFeatures(role)
    .filter((f) => f !== "encryption" && f !== "concerns")
    .sort((a, b) => (NAV_ORDER[a] ?? 999) - (NAV_ORDER[b] ?? 999));

  // Server and first client render → skeleton (guaranteed same → no mismatch)
  if (!isClient) return <SidebarSkeleton />;

  return (
    <aside className="relative z-30 flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="border-b border-gray-100 p-4">
        <Link href="/dashboard" className="flex flex-col gap-1">
          <BrandLogo width={140} />
          <p className="mt-1 text-xs text-gray-500 truncate max-w-[200px] pl-0.5">
            {session?.user?.organizationName || t("sidebar.workspace")}
          </p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {features.map((feature) => {
          const Icon = NAV_ICONS[feature];
          const href = NAV_PATHS[feature];
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={feature}
              href={href}
              prefetch={true}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-[#5D3A8C] text-white"
                  : "text-gray-700 hover:bg-[#F3EEF8] hover:text-[#5D3A8C]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(NAV_LABEL_KEYS[feature]) || FEATURE_LABELS[feature]}
            </Link>
          );
        })}
      </nav>

      {/* Footer — language switcher + account switcher always visible */}
      <div className="border-t border-gray-100 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <Lock className="h-3 w-3 text-[#5D3A8C]" />
          <span>{t("sidebar.encrypted_rest")}</span>
        </div>
        <LanguageSwitcher />
        <AccountSwitcher />
      </div>
    </aside>
  );
}
