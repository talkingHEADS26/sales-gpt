"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from "next/navigation";

import { SiteBrand } from "@/components/site-brand";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

const MIN_PASSWORD_LENGTH = 6;

function getHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isValidRecovery, setIsValidRecovery] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    const initializeRecovery = async () => {
      if (!hasSupabaseEnv) {
        if (isMounted) {
          setError(
            "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
          );
          setIsReady(true);
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        if (isMounted) {
          setError(
            "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
          );
          setIsReady(true);
        }
        return;
      }

      const hashParams = getHashParams();
      const hashErrorDescription = hashParams.get("error_description");
      const hashAccessToken = hashParams.get("access_token");
      const hashRefreshToken = hashParams.get("refresh_token");

      if (hashErrorDescription) {
        if (isMounted) {
          setError(decodeURIComponent(hashErrorDescription));
          setIsReady(true);
        }
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      try {
        if (hashAccessToken && hashRefreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });

          if (setSessionError) {
            throw setSessionError;
          }
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            code
          );

          if (exchangeError) {
            throw exchangeError;
          }

          url.searchParams.delete("code");
          window.history.replaceState(
            {},
            document.title,
            `${url.pathname}${url.search}${url.hash}`
          );
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            "Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an."
          );
        }

        if (isMounted) {
          setIsValidRecovery(true);
          setIsReady(true);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : "Der Reset-Link ist ungültig oder abgelaufen.";

          setError(message);
          setIsReady(true);
        }
      }
    };

    void initializeRecovery();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    if (!isValidRecovery) {
      setError(
        "Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an."
      );
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    try {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
        );
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();
      setSuccess(
        "Dein Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt mit dem neuen Passwort einloggen."
      );
      setIsValidRecovery(false);

      window.setTimeout(() => {
        router.replace("/login?reset=1");
      }, 1400);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Das Passwort konnte nicht aktualisiert werden. Bitte versuche es erneut.";

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
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0e51a0] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(14,81,160,0.32)] transition hover:bg-[#0b478b]"
              >
                Zum Login
              </Link>
            </div>
          </header>

          <section className="flex flex-1 items-center py-10 sm:py-14 lg:py-18">
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] lg:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-[#0e51a0]/15 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0e51a0] shadow-[0_10px_30px_rgba(14,81,160,0.08)] backdrop-blur">
                  Passwort erneuern
                </div>
                <h1 className="mt-6 text-4xl font-semibold tracking-[-0.06em] text-balance text-[#707070] sm:text-5xl lg:text-6xl">
                  Setze dein Passwort sicher neu.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  Sobald dein Recovery-Link erfolgreich verarbeitet wurde, kannst du hier direkt ein neues Passwort vergeben.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -right-6 top-10 hidden h-28 w-28 rounded-full bg-[#0e51a0]/10 blur-2xl sm:block" />
                <div className="rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6">
                  <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-8">
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                        Abschluss<span className="text-[#707070]">IO</span>
                      </p>
                      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#707070]">
                        Neues Passwort setzen
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Verwende ein neues Passwort, das du bisher noch nicht für dieses Konto genutzt hast.
                      </p>
                    </div>

                    {!isReady ? (
                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/95 px-4 py-3 text-sm text-slate-600">
                        Recovery-Link wird geprüft...
                      </div>
                    ) : null}

                    {error ? (
                      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    ) : null}

                    {success ? (
                      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-700">
                        {success}
                      </div>
                    ) : null}

                    {isReady && isValidRecovery ? (
                      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                        <div>
                          <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-[#707070]"
                          >
                            Neues Passwort
                          </label>
                          <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Neues Passwort"
                            autoComplete="new-password"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                            disabled={isLoading}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="confirmPassword"
                            className="mb-2 block text-sm font-medium text-[#707070]"
                          >
                            Passwort bestätigen
                          </label>
                          <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
                            placeholder="Passwort wiederholen"
                            autoComplete="new-password"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                            disabled={isLoading}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0e51a0] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(14,81,160,0.32)] transition hover:bg-[#0b478b] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isLoading ? "Aktualisiere Passwort..." : "Passwort aktualisieren"}
                        </button>
                      </form>
                    ) : null}

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <Link
                        className="transition hover:text-[#0e51a0]"
                        href="/forgot-password"
                      >
                        Neuen Link anfordern
                      </Link>
                      <Link
                        className="font-medium text-[#707070] transition hover:text-[#0e51a0]"
                        href="/login"
                      >
                        Zurück zum Login
                      </Link>
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
