"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicLanguageSwitcher } from "@/components/ui/PublicLanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleOk, setGoogleOk] = useState(true);

  const isSwitchMode = params.get("switch") === "1";

  useEffect(() => {
    const preEmail = params.get("email");
    if (preEmail) setEmail(decodeURIComponent(preEmail));
    const oauthErr = params.get("error");
    if (oauthErr === "OAuthCallback" || oauthErr === "OAuthAccountNotLinked") {
      setError(t("auth.google_failed"));
    }
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((d) => setGoogleOk(!!d.googleConfigured))
      .catch(() => setGoogleOk(false));
  }, [params, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(t("auth.invalid_credentials"));
      return;
    }
    router.push(params.get("callbackUrl") || "/dashboard");
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
          {t("auth.welcome_back")}
        </h1>
        <p className="mt-2 text-gray-600">{t("auth.signin_desc")}</p>
      </div>
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <BrandLogo width={160} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isSwitchMode ? t("auth.switch_account") : t("auth.login")}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t("auth.new_here")}{" "}
            <Link href="/signup" className="text-[#5D3A8C] hover:underline">
              {t("auth.create_account")}
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
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t("auth.continue_google")}
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("auth.email")}
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email_placeholder")}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("auth.password")}
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t("auth.signing_in") : t("auth.sign_in")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
