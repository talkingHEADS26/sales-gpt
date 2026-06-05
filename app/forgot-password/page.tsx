"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";

import { SiteBrand } from "@/components/site-brand";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedEmail = email.trim();

    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    if (!trimmedEmail) {
      setError("Bitte gib deine E-Mail-Adresse ein.");
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }

    try {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "https://abschluss-io.de/reset-password";

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
        );
      }

      console.log("[auth] reset redirect:", redirectTo);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo,
        }
      );

      if (resetError) {
        throw resetError;
      }

      setSuccess(
        "Wenn für diese E-Mail ein Konto existiert, wurde ein Passwort-Reset-Link versendet."
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Die Reset-Mail konnte nicht versendet werden. Bitte versuche es erneut.";

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className={`${plusJakartaSans.className} min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dcecff_0%,#f7fbff_38%,#f6f8fc_72%,#eef3f9_100%)] text-[#707070]`}
    >
      <div className="relative isolate min-h-screen">
        <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[linear-gradient(135deg,rgba(14,81,160,0.18),rgba(14,81,160,0.03)_46%,rgba(255,255,255,0)_72%)]" />
        <div className="absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0e51a0]/12 blur-3xl" />

        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/75 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur md:px-6">
            <SiteBrand href="/" />
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-[#707070] transition hover:bg-slate-100 hover:text-[#707070]"
              >
                Startseite
              </Link>
              <Link
                href="/login"
                className="th-reference-cta min-h-14 px-7 py-3 text-sm"
              >
                Zurück zum Login
              </Link>
            </div>
          </header>

          <section className="flex flex-1 items-center py-10 sm:py-14 lg:py-18">
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] lg:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-[#0e51a0]/15 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0e51a0] shadow-[0_10px_30px_rgba(14,81,160,0.08)] backdrop-blur">
                  Passwort zurücksetzen
                </div>
                <h1 className="mt-6 text-4xl font-semibold tracking-[-0.06em] text-balance text-[#707070] sm:text-5xl lg:text-6xl">
                  Neuer Zugriff in wenigen Schritten.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  Gib die E-Mail-Adresse deines Kontos ein. Wir schicken dir einen sicheren Link, über den du dein Passwort neu setzen kannst.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -right-6 top-10 hidden h-28 w-28 rounded-full bg-[#0e51a0]/10 blur-2xl sm:block" />
                <div className="rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6">
                  <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-8">
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                        talkingHEADS Sales Trainer
                      </p>
                      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#707070]">
                        Reset-Link anfordern
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Nach dem Versand kannst du über den Link in der Mail direkt auf die Reset-Seite dieser App wechseln.
                      </p>
                    </div>

                    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                      <div>
                        <label
                          htmlFor="email"
                          className="mb-2 block text-sm font-medium text-[#707070]"
                        >
                          E-Mail
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="name@example.com"
                          autoComplete="email"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                          disabled={isLoading}
                        />
                      </div>

                      {error ? (
                        <p className="rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700">
                          {error}
                        </p>
                      ) : null}

                      {success ? (
                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-700">
                          {success}
                        </p>
                      ) : null}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="th-reference-cta w-full"
                      >
                        {isLoading ? "Sende Link..." : "Reset-Link senden"}
                      </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <Link className="transition hover:text-[#0e51a0]" href="/login">
                        Zurück zum Login
                      </Link>
                      <p className="font-medium text-[#707070]">Zugang erfolgt nach Kauf</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
