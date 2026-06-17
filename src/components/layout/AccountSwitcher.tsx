"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronUp, Plus, Check, LogOut, RefreshCw } from "lucide-react";
import type { UserRole } from "@/lib/permissions";
import { useLabels } from "@/hooks/useLabels";

const STORAGE_KEY = "yusi_accounts";

type StoredAccount = {
  email: string;
  name: string;
  role: string;
  organizationName: string;
  image?: string | null;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({
  account,
  size = "md",
}: {
  account: StoredAccount;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  if (account.image) {
    return (
      <span className={`${dim} overflow-hidden rounded-full shrink-0`}>
        <img
          src={account.image}
          alt={account.name}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className={`${dim} flex items-center justify-center rounded-full bg-[#5D3A8C] font-bold text-white shrink-0`}
    >
      {getInitials(account.name || account.email)}
    </span>
  );
}

export function AccountSwitcher() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t, role } = useLabels();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!session?.user?.email) return;

    const current: StoredAccount = {
      email: session.user.email,
      name: session.user.name || session.user.email,
      role: session.user.role || "MEMBER",
      organizationName: session.user.organizationName || t("general.workspace"),
      image: session.user.image ?? null,
    };

    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: StoredAccount[] = raw ? JSON.parse(raw) : [];
    const updated = [
      current,
      ...existing.filter((a) => a.email !== current.email),
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setAccounts(updated);
  }, [session, t]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!session?.user) return null;
  if (!mounted) {
    return (
      <div className="w-full flex items-center gap-2 rounded-xl p-2">
        <span className="h-9 w-9 rounded-full bg-[#5D3A8C]/20 shrink-0 animate-pulse" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-2 w-16 rounded bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const current: StoredAccount = {
    email: session.user.email!,
    name: session.user.name || session.user.email!,
    role: session.user.role || "MEMBER",
    organizationName: session.user.organizationName || t("general.workspace"),
    image: session.user.image ?? null,
  };

  const otherAccounts = accounts.filter((a) => a.email !== current.email);

  function switchAccount(acc: StoredAccount) {
    setOpen(false);
    signOut({
      redirect: false,
    }).then(() => {
      router.push(`/login?email=${encodeURIComponent(acc.email)}&switch=1`);
    });
  }

  function addAccount() {
    setOpen(false);
    signOut({ redirect: false }).then(() => {
      router.push("/login?switch=1");
    });
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-xl p-2 hover:bg-[#F3EEF8] transition group"
      >
        <Avatar account={current} />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-gray-900 truncate leading-tight">
            {current.name}
          </p>
          <p className="text-[11px] text-gray-500 truncate leading-tight">
            {current.organizationName}
          </p>
        </div>
        <ChevronUp
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2 bg-[#F3EEF8]/60 border-b border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5D3A8C]">
              {t("account.accounts_orgs")}
            </p>
          </div>

          <div className="px-3 py-2.5 flex items-center gap-2.5 bg-[#F3EEF8]/40">
            <Avatar account={current} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {current.name}
              </p>
              <p className="text-[11px] text-gray-500 truncate">{current.email}</p>
              <span className="mt-0.5 inline-block rounded-full bg-[#5D3A8C] px-2 py-0.5 text-[9px] font-medium text-white">
                {role(current.role as UserRole)}
              </span>
            </div>
            <Check className="h-4 w-4 text-[#5D3A8C] shrink-0" />
          </div>

          {otherAccounts.length > 0 && (
            <>
              <div className="h-px bg-gray-100 mx-3" />
              {otherAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => switchAccount(acc)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#F3EEF8]/60 transition"
                >
                  <Avatar account={acc} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {acc.name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{acc.email}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {acc.organizationName}
                    </p>
                  </div>
                  <RefreshCw className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                </button>
              ))}
            </>
          )}

          <div className="h-px bg-gray-100 mx-3" />

          <button
            onClick={addAccount}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[#5D3A8C] hover:bg-[#F3EEF8]/60 transition"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-[#5D3A8C]/40 shrink-0">
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium">{t("account.add_account")}</span>
          </button>

          <div className="h-px bg-gray-100 mx-3" />

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-gray-500 hover:bg-gray-50 hover:text-red-500 transition"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="text-sm">{t("account.sign_out")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
