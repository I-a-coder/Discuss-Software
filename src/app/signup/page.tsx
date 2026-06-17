"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicLanguageSwitcher } from "@/components/ui/PublicLanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function SignupPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleOk, setGoogleOk] = useState(true);

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((d) => setGoogleOk(!!d.googleConfigured))
      .catch(() => setGoogleOk(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, orgName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t("auth.signup_failed"));
      return;
    }
    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (signInRes?.ok) router.push("/dashboard");
    else router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <PublicLanguageSwitcher />
      <div className="hidden w-1/2 flex-col justify-center bg-[#F3EEF8] p-12 lg:flex">
        <BrandLogo width={200} className="mb-6" />
        <h1
          className="text-3xl font-bold text-[#5D3A8C]"
          style={{ fontFamily: "var(--font-libre)" }}
        >
          {t("auth.start_collab")}
        </h1>
        <p className="mt-2 text-gray-600">{t("auth.signup_desc")}</p>
        <ul className="mt-6 space-y-2 text-sm text-gray-700">
          <li>✓ {t("auth.signup_bullet1")}</li>
          <li>✓ {t("auth.signup_bullet2")}</li>
          <li>✓ {t("auth.signup_bullet3")}</li>
          <li>✓ {t("auth.signup_bullet4")}</li>
        </ul>
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">{t("auth.create_account_title")}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {t("auth.already_have")}{" "}
            <Link href="/login" className="text-[#5D3A8C] hover:underline">
              {t("auth.login")}
            </Link>
          </p>

          {!googleOk && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("auth.google_not_configured")}
            </p>
          )}
          <button
            type="button"
            disabled={!googleOk}
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("auth.signup_google")}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">{t("auth.or_email")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.your_name")}</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.work_email")}</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.password")}</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("auth.org_name_optional")}
              </label>
              <input
                className="input-field"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={t("auth.org_placeholder")}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t("auth.creating") : t("auth.create_account_btn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
