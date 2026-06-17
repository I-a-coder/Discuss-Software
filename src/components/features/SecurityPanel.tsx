"use client";



import { Shield, Lock, Key, FileCheck } from "lucide-react";

import { PageHeader } from "./PageHeader";

import { useLanguage } from "@/contexts/LanguageContext";



export function SecurityPanel() {

  const { t } = useLanguage();



  const cards = [

    {

      icon: Lock,

      titleKey: "security.encryption_title" as const,

      descKey: "security.encryption_desc" as const,

    },

    {

      icon: Key,

      titleKey: "security.key_title" as const,

      descKey: "security.key_desc" as const,

    },

    {

      icon: Shield,

      titleKey: "security.rbac_title" as const,

      descKey: "security.rbac_desc" as const,

    },

    {

      icon: FileCheck,

      titleKey: "security.audit_title" as const,

      descKey: "security.audit_desc" as const,

    },

  ];



  const matrixRows = [

    { key: "security.row_discussion_post" as const, perms: ["✓", "✓", "✓", "—"] },

    { key: "security.row_discussion_read" as const, perms: ["✓", "✓", "✓", "✓"] },

    { key: "security.row_whiteboard" as const, perms: ["✓", "✓", "✓", "—"] },

    { key: "security.row_ai" as const, perms: ["✓", "✓", "✓", "—"] },

    { key: "security.row_meetings" as const, perms: ["✓", "✓", "✓", "—"] },

    { key: "security.row_board" as const, perms: ["✓", "✓", "✓", "—"] },

    { key: "security.row_notes" as const, perms: ["✓", "✓", "✓", "✓"] },

    { key: "security.row_history" as const, perms: ["✓", "✓", "✓", "✓"] },

    { key: "security.row_team_settings" as const, perms: ["✓", "✓", "—", "—"] },

    { key: "security.row_change_roles" as const, perms: ["✓", "—", "—", "—"] },

  ];



  return (

    <div>

      <PageHeader

        title={t("nav.security")}

        description={t("security.desc")}

        help={t("security.help")}

      />

      <div className="grid gap-4 md:grid-cols-2">

        {cards.map((item) => (

          <div key={item.titleKey} className="card p-6">

            <item.icon className="mb-3 h-8 w-8 text-[#5D3A8C]" />

            <h3 className="font-semibold text-gray-900">{t(item.titleKey)}</h3>

            <p className="mt-2 text-sm text-gray-600">{t(item.descKey)}</p>

          </div>

        ))}

      </div>

      <div className="mt-6 card p-6 bg-[#F3EEF8]/50">

        <h3 className="font-semibold text-[#5D3A8C]">{t("security.matrix_title")}</h3>

        <div className="mt-4 overflow-x-auto">

          <table className="w-full text-xs">

            <thead>

              <tr className="text-left text-[#5D3A8C]">

                <th className="py-2 pr-4">{t("security.col_feature")}</th>

                <th className="py-2 px-2">{t("security.col_owner")}</th>

                <th className="py-2 px-2">{t("security.col_admin")}</th>

                <th className="py-2 px-2">{t("security.col_member")}</th>

                <th className="py-2 px-2">{t("security.col_guest")}</th>

              </tr>

            </thead>

            <tbody className="text-gray-700">

              {matrixRows.map((row) => (

                <tr key={row.key} className="border-t border-gray-200">

                  <td className="py-2 pr-4">{t(row.key)}</td>

                  {row.perms.map((c, i) => (

                    <td key={i} className="py-2 px-2 text-center">

                      {c}

                    </td>

                  ))}

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  );

}


