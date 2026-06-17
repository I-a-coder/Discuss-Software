"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicLanguageSwitcher } from "@/components/ui/PublicLanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  MessageSquare,
  PenTool,
  Bot,
  Shield,
  Kanban,
  Users,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: MessageSquare,
      title: t("home.feature_discussion_title"),
      desc: t("home.feature_discussion_desc"),
    },
    {
      icon: PenTool,
      title: t("home.feature_whiteboard_title"),
      desc: t("home.feature_whiteboard_desc"),
    },
    {
      icon: Bot,
      title: t("home.feature_ai_title"),
      desc: t("home.feature_ai_desc"),
    },
    {
      icon: Kanban,
      title: t("home.feature_board_title"),
      desc: t("home.feature_board_desc"),
    },
    {
      icon: Shield,
      title: t("home.feature_security_title"),
      desc: t("home.feature_security_desc"),
    },
    {
      icon: Users,
      title: t("home.feature_roles_title"),
      desc: t("home.feature_roles_desc"),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicLanguageSwitcher />
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <BrandLogo width={160} />
          </Link>
          <div className="flex gap-3">
            <Link href="/login" className="btn-secondary">
              {t("home.login")}
            </Link>
            <Link href="/signup" className="btn-primary">
              {t("home.signup_free")}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:py-24">
        <BrandLogo width={280} className="mx-auto mb-8" />
        <h1
          className="text-4xl font-bold text-[#5D3A8C] md:text-5xl"
          style={{ fontFamily: "var(--font-libre)" }}
        >
          {t("home.tagline")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          {t("home.subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/signup" className="btn-primary text-base px-8 py-3">
            {t("home.get_started")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-3">
            {t("home.login_google")}
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">{t("home.demo")}</p>
      </section>

      <section className="bg-[#F8F9FA] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className="mb-10 text-center text-2xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-libre)" }}
          >
            {t("home.features_title")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card p-6">
                <f.icon className="mb-3 h-8 w-8 text-[#5D3A8C]" />
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Yusi Discuss · {t("home.footer")}
      </footer>
    </div>
  );
}
