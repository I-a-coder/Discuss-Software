"use client";



import { useEffect, useState } from "react";

import { Building2, User } from "lucide-react";

import { PageHeader } from "./PageHeader";

import { useLanguage } from "@/contexts/LanguageContext";



type Log = {

  id: string;

  action: string;

  details: string | null;

  createdAt: string;

  user: { name: string | null; email: string } | null;

};



export function ActivityHistory() {

  const { t } = useLanguage();

  const [scope, setScope] = useState<"org" | "personal">("org");

  const [logs, setLogs] = useState<Log[]>([]);



  useEffect(() => {

    fetch(`/api/history?scope=${scope}`)

      .then((r) => r.json())

      .then(setLogs);

  }, [scope]);



  return (

    <div>

      <PageHeader

        title={t("nav.history")}

        description={t("history.desc")}

        help={t("history.help")}

      />

      <div className="mb-4 flex gap-2">

        <button

          onClick={() => setScope("org")}

          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${

            scope === "org"

              ? "bg-[#5D3A8C] text-white"

              : "bg-white border border-gray-200 text-gray-700"

          }`}

        >

          <Building2 className="h-4 w-4" /> {t("history.organization")}

        </button>

        <button

          onClick={() => setScope("personal")}

          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${

            scope === "personal"

              ? "bg-[#5D3A8C] text-white"

              : "bg-white border border-gray-200 text-gray-700"

          }`}

        >

          <User className="h-4 w-4" /> {t("history.my_activity")}

        </button>

      </div>

      <div className="card divide-y divide-gray-100">

        {logs.map((log) => (

          <div key={log.id} className="flex gap-4 p-4">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3EEF8] text-xs font-bold text-[#5D3A8C]">

              {log.action.slice(0, 2)}

            </div>

            <div className="flex-1 min-w-0">

              <p className="font-medium text-gray-900">

                {log.action.replace(/_/g, " ")}

              </p>

              {log.details && (

                <p className="text-sm text-gray-600 truncate">{log.details}</p>

              )}

              <p className="mt-1 text-xs text-gray-400">

                {log.user?.name || log.user?.email || t("history.system")} ·{" "}

                {new Date(log.createdAt).toLocaleString()}

              </p>

            </div>

          </div>

        ))}

        {logs.length === 0 && (

          <p className="p-8 text-center text-gray-500">{t("history.no_activity")}</p>

        )}

      </div>

    </div>

  );

}


