"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";

import { SiteBrand } from "@/components/site-brand";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

type LoginUiError = {
  title: string;
  detail?: string;
};

type LoginFormProps = {
  confirmationCode?: string;
  confirmationErrorDescription?: string;
  confirmed: boolean;
  confirmationMailSent: boolean;
  defaultEmail?: string;
  invited: boolean;
  reset: boolean;
  registered: boolean;
  tokenHash?: string;
  tokenType?: string;
};

const DEFAULT_LOGIN_ERROR: LoginUiError = {
  title: "Anmeldung aktuell nicht möglich.",
  detail: "Bitte versuche es in wenigen Augenblicken erneut.",
};

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 5.7A10.5 10.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.7 17.7 0 0 1-3.1 4.1" />
      <path d="M6.6 6.7A17.2 17.2 0 0 0 2.5 12S6 18.5 12 18.5c1.7 0 3.1-.5 4.4-1.2" />
      <path d="M9.9 9.9A3 3 0 0 0 9 12a3 3 0 0 0 3 3c.8 0 1.5-.3 2.1-.9" />
    </svg>
  );
}

function mapLoginError(error: unknown): LoginUiError {
  if (!(error instanceof Error)) {
    return DEFAULT_LOGIN_ERROR;
  }

  const normalizedMessage = error.message.trim().toLowerCase();

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid email or password")
  ) {
    return {
      title: "E-Mail oder Passwort sind nicht korrekt.",
      detail: "Bitte prüfe deine Eingaben und versuche es erneut.",
    };
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return {
      title: "Deine E-Mail-Adresse ist noch nicht bestätigt.",
      detail: "Bitte prüfe dein Postfach.",
    };
  }

  if (normalizedMessage.includes("failed to fetch")) {
    return {
      title: "Die Anmeldung konnte nicht abgeschlossen werden.",
      detail: "Bitte prüfe deine Verbindung und versuche es erneut.",
    };
  }

  if (
    normalizedMessage.includes("supabase ist noch nicht vollständig konfiguriert") ||
    normalizedMessage.includes("supabase konnte nicht initialisiert werden")
  ) {
    return {
      title: "Die Anmeldung ist derzeit nicht verfügbar.",
      detail: "Bitte prüfe die Systemkonfiguration.",
    };
  }

  if (normalizedMessage.includes("account_inactive")) {
    return {
      title: "Dein Konto wurde registriert und wartet aktuell auf Freischaltung.",
      detail: "Bitte warte auf die manuelle Freigabe durch das talkingHEADS Sales Trainer-Team.",
    };
  }

  if (normalizedMessage.includes("subscription_expired")) {
    return {
      title: "Dein Zugang ist abgelaufen.",
      detail: "Bitte prüfe den Status deines Abos oder wende dich an das talkingHEADS Sales Trainer-Team.",
    };
  }

  if (
    normalizedMessage.includes("subscription_inactive") ||
    normalizedMessage.includes("subscription_missing")
  ) {
    return {
      title: "Dein Zugang ist aktuell nicht aktiv.",
      detail: "Für diesen Account liegt derzeit kein aktives CopeCart-Abo vor.",
    };
  }

  if (normalizedMessage.includes("organization_inactive")) {
    return {
      title: "Deine Organisation ist derzeit deaktiviert.",
      detail: "Bitte wende dich an deine Administration oder an das talkingHEADS Sales Trainer-Team.",
    };
  }

  return DEFAULT_LOGIN_ERROR;
}

async function triggerWelcomeEmail(accessToken: string | undefined) {
  if (!accessToken) {
    return;
  }

  try {
    await fetch("/api/auth/welcome-email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (welcomeError) {
    console.warn("[welcome-mailer] Welcome email trigger failed.", welcomeError);
  }
}

async function verifyAppAccess(accessToken: string | undefined) {
  if (!accessToken) {
    throw new Error("Nicht autorisiert.");
  }

  const response = await fetch("/api/auth/access-status", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseBody = (await response.json()) as {
    code?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(responseBody.code ?? responseBody.error ?? "access_denied");
  }
}

export function LoginForm({
  confirmationCode,
  confirmationErrorDescription,
  confirmed,
  confirmationMailSent,
  defaultEmail,
  invited,
  reset,
  registered,
  tokenHash,
  tokenType,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<LoginUiError | null>(null);
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [resendSuccessMessage, setResendSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const completeEmailConfirmation = async () => {
      if (confirmationErrorDescription) {
        if (!isMounted) {
          return;
        }

        setError({
          title: "Die Bestätigung der E-Mail-Adresse ist fehlgeschlagen.",
          detail: decodeURIComponent(confirmationErrorDescription),
        });
        return;
      }

      const hasConfirmationCode = Boolean(confirmationCode);
      const hasSignupToken = Boolean(
        tokenHash && (tokenType === "signup" || tokenType === "magiclink")
      );

      if (!hasConfirmationCode && !hasSignupToken) {
        return;
      }

      if (!hasSupabaseEnv) {
        if (isMounted) {
          setError({
            title: "Die Bestätigung ist derzeit nicht verfügbar.",
            detail: "Bitte prüfe die Konfiguration der Anwendung.",
          });
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        if (isMounted) {
          setError({
            title: "Die Bestätigung ist derzeit nicht verfügbar.",
            detail: "Supabase konnte nicht initialisiert werden.",
          });
        }
        return;
      }

      try {
        if (isMounted) {
          setIsConfirmingEmail(true);
          setError(null);
        }

        if (confirmationCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(confirmationCode);

          if (exchangeError) {
            throw exchangeError;
          }
        } else if (
          tokenHash &&
          (tokenType === "signup" || tokenType === "magiclink")
        ) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: tokenType,
          });

          if (verifyError) {
            throw verifyError;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        await triggerWelcomeEmail(session?.access_token);
        await supabase.auth.signOut();

        if (isMounted) {
          router.replace("/login?confirmed=1");
        }
      } catch (confirmationError) {
        if (!isMounted) {
          return;
        }

        const detail =
          confirmationError instanceof Error
            ? confirmationError.message
            : "Die E-Mail-Adresse konnte nicht bestätigt werden.";

        setError({
          title: "Die Bestätigung der E-Mail-Adresse ist fehlgeschlagen.",
          detail,
        });
      } finally {
        if (isMounted) {
          setIsConfirmingEmail(false);
        }
      }
    };

    void completeEmailConfirmation();

    return () => {
      isMounted = false;
    };
  }, [confirmationCode, confirmationErrorDescription, router, tokenHash, tokenType]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResendSuccessMessage("");

    const trimmedEmail = email.trim();

    if (!hasSupabaseEnv) {
      setError({
        title: "Die Anmeldung ist derzeit nicht verfügbar.",
        detail: "Bitte prüfe die Konfiguration der Anwendung.",
      });
      return;
    }

    if (!trimmedEmail) {
      setError({ title: "Bitte gib deine E-Mail-Adresse ein." });
      return;
    }

    if (!password) {
      setError({ title: "Bitte gib dein Passwort ein." });
      return;
    }

    if (isConfirmingEmail) {
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

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      await triggerWelcomeEmail(session?.access_token);
      router.push("/dashboard");
    } catch (err) {
      const supabase = getSupabaseBrowserClient();
      await supabase?.auth.signOut();
      setError(mapLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const trimmedEmail = email.trim();

    setResendSuccessMessage("");

    if (!trimmedEmail) {
      setError({
        title: "Bitte gib zuerst deine E-Mail-Adresse ein.",
      });
      return;
    }

    if (!hasSupabaseEnv) {
      setError({
        title: "Die Bestätigung ist derzeit nicht verfügbar.",
        detail: "Bitte prüfe die Konfiguration der Anwendung.",
      });
      return;
    }

    try {
      setIsResendingConfirmation(true);

      const response = await fetch("/api/auth/confirmation-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      });
      const responseBody = (await response.json()) as {
        error?: string;
        mode?: "sent" | "skipped";
        reason?: string;
      };

      if (!response.ok) {
        throw new Error(
          responseBody.error ??
            "Der Bestätigungslink konnte nicht erneut gesendet werden."
        );
      }

      if (responseBody.mode !== "sent") {
        if (responseBody.reason === "already_confirmed") {
          setError({
            title: "Diese E-Mail-Adresse ist bereits bestätigt.",
          });
          return;
        }

        throw new Error(
          responseBody.error ??
            "Der Bestätigungslink konnte nicht erneut gesendet werden."
        );
      }

      setError(null);
      setResendSuccessMessage(
        "Wir haben dir einen neuen Bestätigungslink per E-Mail gesendet."
      );
    } catch (resendError) {
      setError({
        title:
          "Der Bestätigungslink konnte nicht erneut gesendet werden. Bitte versuche es erneut.",
        detail:
          resendError instanceof Error ? resendError.message : undefined,
      });
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  return (
    <main
      className={`${plusJakartaSans.className} min-h-screen overflow-hidden bg-white text-[#707070]`}
    >
      <div className="relative isolate min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[#dbe7f8] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(14,81,160,0.10)] md:px-6">
            <SiteBrand href="/" />
            <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
              <Link
                href="/"
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-3 text-sm font-medium text-[#707070] transition hover:bg-slate-100 hover:text-[#707070] sm:min-h-11 sm:px-4"
              >
                Startseite
              </Link>
            </div>
          </header>

          <section className="flex flex-1 items-center py-8 sm:py-10 lg:py-12">
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] lg:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-[#0e51a0]/15 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0e51a0] shadow-[0_10px_30px_rgba(14,81,160,0.08)] backdrop-blur">
                  Dein Zugang zum Sales-Training
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-balance text-[#707070] sm:text-4xl lg:text-5xl">
                  Willkommen zurück im Training.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  Melde dich an und knüpfe genau dort an, wo dein Team zuletzt trainiert hat: mit klaren Gesprächen, besserer Struktur und mehr Abschlusssicherheit.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    "Praxisnahe Verkaufssituationen",
                    "Direkte Lernimpulse pro Session",
                    "Fortschritt für Teams transparent",
                  ].map((benefit) => (
                    <div
                      key={benefit}
                      className="rounded-2xl border border-[#dce7f7] bg-white px-4 py-4 text-sm font-medium text-[#4b5565] shadow-[0_10px_24px_rgba(14,81,160,0.08)]"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] shadow-[0_8px_18px_rgba(234,148,19,0.32)]" />
                        <span className="h-1.5 w-9 rounded-full bg-[#0e51a0]/85" />
                      </div>
                      <p className="leading-6">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[2rem] border border-[#0b478b] bg-[#0E51A0] p-5 shadow-[0_24px_60px_rgba(14,81,160,0.28)] sm:p-6">
                  <div className="rounded-[1.6rem] border border-white/20 bg-transparent p-6 sm:p-8">
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#dce8fb]">
                        talkingHEADS Login
                      </p>
                      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                        In dein Konto einloggen
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-[#dce8fb]">
                        Nutze deine Zugangsdaten und setze eure Trainingssessions ohne Umwege fort.
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      {!hasSupabaseEnv ? (
                        <p className="rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-800">
                          Die lokale Supabase-Konfiguration fehlt oder ist unvollständig.
                        </p>
                      ) : null}

                      {registered ? (
                        confirmationMailSent ? (
                          <p className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-700">
                            Registrierung erfolgreich. Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deinem Postfach.
                          </p>
                        ) : (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-800">
                            <p>
                              Registrierung erfolgreich, aber der Bestätigungslink konnte nicht automatisch gesendet werden.
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleResendConfirmation()}
                              disabled={isResendingConfirmation || !email.trim()}
                              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isResendingConfirmation
                                ? "Sende erneut..."
                                : "Bestätigungslink jetzt senden"}
                            </button>
                          </div>
                        )
                      ) : null}

                      {confirmed ? (
                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-700">
                          Deine E-Mail-Adresse wurde bestätigt. Dein Zugang wird nach Prüfung freigeschaltet.
                        </p>
                      ) : null}

                      {isConfirmingEmail ? (
                        <p className="rounded-2xl border border-[#0e51a0]/15 bg-[#0e51a0]/5 px-4 py-3 text-sm text-[#0e51a0]">
                          Deine E-Mail-Adresse wird gerade bestätigt...
                        </p>
                      ) : null}

                      {resendSuccessMessage ? (
                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-700">
                          {resendSuccessMessage}
                        </p>
                      ) : null}

                      {invited ? (
                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-700">
                          Einladung erfolgreich angenommen. Du kannst dich jetzt einloggen.
                        </p>
                      ) : null}

                      {reset ? (
                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-700">
                          Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt mit deinem neuen Passwort einloggen.
                        </p>
                      ) : null}
                    </div>

                    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                      <div>
                        <label
                          htmlFor="email"
                          className="mb-2 block text-sm font-medium text-white"
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
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#ffffff] [&:-webkit-autofill]:[-webkit-text-fill-color:#374151]"
                          disabled={
                            isLoading || isConfirmingEmail || isResendingConfirmation
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="password"
                          className="mb-2 block text-sm font-medium text-white"
                        >
                          Passwort
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Dein Passwort"
                            autoComplete="current-password"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#ffffff] [&:-webkit-autofill]:[-webkit-text-fill-color:#374151]"
                            disabled={
                              isLoading || isConfirmingEmail || isResendingConfirmation
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            aria-label={
                              showPassword
                                ? "Passwort verbergen"
                                : "Passwort anzeigen"
                            }
                            className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-400 transition hover:text-[#0e51a0] focus:outline-none focus-visible:text-[#0e51a0]"
                            disabled={
                              isLoading || isConfirmingEmail || isResendingConfirmation
                            }
                          >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Link
                          href="/forgot-password"
                          className="text-sm font-medium text-[#0e51a0] transition hover:text-[#0b478b]"
                        >
                          Passwort vergessen?
                        </Link>
                      </div>

                      {error ? (
                        <div
                          role="alert"
                          aria-live="polite"
                          className="flex items-start gap-3 rounded-[1.35rem] border border-[#efc7c1] bg-[linear-gradient(180deg,rgba(255,247,245,0.98)_0%,rgba(255,241,238,0.95)_100%)] px-4 py-3.5 text-[#8e3d31] shadow-[0_18px_40px_rgba(194,83,58,0.08)]"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#f2d4cf] bg-white/75 text-[#c2533a] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 20 20"
                              fill="none"
                              className="h-4 w-4"
                            >
                              <path
                                d="M10 6.25V10.25"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                              <circle cx="10" cy="13.75" r="1" fill="currentColor" />
                              <path
                                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-6 text-[#8e3d31]">
                              {error.title}
                            </p>
                            {error.detail ? (
                              <p className="mt-0.5 text-sm leading-6 text-[#a25747]">
                                {error.detail}
                              </p>
                            ) : null}
                            {error.title ===
                            "Deine E-Mail-Adresse ist noch nicht bestätigt." ? (
                              <button
                                type="button"
                                onClick={() => void handleResendConfirmation()}
                                disabled={
                                  isLoading ||
                                  isConfirmingEmail ||
                                  isResendingConfirmation
                                }
                                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-[#f2d4cf] bg-white/90 px-4 py-2 text-sm font-medium text-[#8e3d31] transition hover:border-[#c2533a]/35 hover:text-[#c2533a] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isResendingConfirmation
                                  ? "Sende erneut..."
                                  : "Bestätigungslink erneut senden"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={
                          isLoading || isConfirmingEmail || isResendingConfirmation
                        }
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(234,148,19,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(234,148,19,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? "Logge ein..." : "Einloggen"}
                      </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <Link className="text-[#dce8fb] transition hover:text-white" href="/">
                        Zur Startseite
                      </Link>
                      <Link
                        className="font-medium text-white transition hover:text-[#dce8fb]"
                        href="/register"
                      >
                        Noch kein Konto? Hier registrieren
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
