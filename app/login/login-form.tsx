"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteLogo } from "@/components/site-brand";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

type LoginUiError = {
  title: string;
  detail?: string;
};

type LoginFormProps = {
  confirmationCode?: string;
  confirmationErrorDescription?: string;
  confirmed: boolean;
  confirmationMailError?: string;
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
  confirmationMailError,
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

      await verifyAppAccess(session?.access_token);
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
    <main className="min-h-screen bg-white text-[#707070]">
      <header className="site-header">
        <div className="landing-container site-header__inner">
          <Link href="/landing" className="brand" aria-label="talkingHEADS Startseite">
            <SiteLogo priority className="brand__logo" />
          </Link>

          <nav className="site-nav" aria-label="Hauptnavigation">
            <Link href="/landing#top" className="site-nav__link">
              Startseite
            </Link>
            <Link href="/landing#loesungen" className="site-nav__link">
              Vorteile
            </Link>
            <Link href="/landing#branchen" className="site-nav__link">
              Für wen
            </Link>
            <Link href="/landing#preise" className="site-nav__link">
              Preise
            </Link>
          </nav>

          <Link className="btn btn-primary site-header__cta" href="/landing#preise">
            Jetzt starten
          </Link>

          <details className="mobile-nav">
            <summary className="mobile-nav__toggle" aria-label="Navigation öffnen">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </summary>
            <nav className="mobile-nav__panel" aria-label="Mobile Hauptnavigation">
              <Link href="/landing#top" className="mobile-nav__link">
                Startseite
              </Link>
              <Link href="/landing#loesungen" className="mobile-nav__link">
                Vorteile
              </Link>
              <Link href="/landing#branchen" className="mobile-nav__link">
                Für wen
              </Link>
              <Link href="/landing#preise" className="mobile-nav__link">
                Preise
              </Link>
              <Link href="/landing#preise" className="btn btn-primary mobile-nav__cta">
                Jetzt starten
              </Link>
            </nav>
          </details>
        </div>
      </header>

      <section className="login-hero">
        <div className="landing-container login-hero__inner">
          <div className="login-hero__copy">
            <div className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white">
              Dein Zugang zum Sales-Training
            </div>
            <h1 className="mt-5 text-balance font-heading text-3xl font-normal tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
              Willkommen zurück im Training.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/90 sm:text-lg sm:leading-8">
              Melde dich an und knüpfe genau dort an, wo dein Team zuletzt trainiert hat: mit klaren Gesprächen, besserer Struktur und mehr Abschlusssicherheit.
            </p>
          </div>

          <div className="login-form-card relative">
            <div className="rounded-[2rem] border border-white/35 bg-[linear-gradient(180deg,rgba(247,251,255,0.72)_0%,rgba(232,240,250,0.56)_100%)] p-5 shadow-[0_18px_44px_rgba(14,81,160,0.14)] backdrop-blur-xl sm:p-6">
              <div className="p-6 sm:p-8">
                <div className="text-center sm:text-left">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#124E9D]">
                        talkingHEADS Login
                      </p>
                      <h2 className="mt-4 font-heading text-3xl font-normal tracking-[-0.03em] text-[#124E9D]">
                        In dein Konto einloggen
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-[#5F6F84]">
                        Nutze deine Zugangsdaten und setze eure Trainingssessions ohne Umwege fort.
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      {!hasSupabaseEnv ? (
                        <p className="rounded-2xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-[#5F6F84]">
                          Die lokale Supabase-Konfiguration fehlt oder ist unvollständig.
                        </p>
                      ) : null}

                      {registered ? (
                        confirmationMailSent ? (
                          <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/75 px-4 py-3 text-sm text-emerald-700">
                            Registrierung erfolgreich. Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deinem Postfach.
                          </p>
                        ) : (
                          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-[#5F6F84]">
                            <p>
                              Registrierung erfolgreich, aber der Bestätigungslink konnte nicht automatisch gesendet werden.
                            </p>
                            {confirmationMailError ? (
                              <p className="mt-2 text-xs leading-6 text-[#5F6F84]">
                                Technischer Hinweis: {confirmationMailError}
                              </p>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void handleResendConfirmation()}
                              disabled={isResendingConfirmation || !email.trim()}
                              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-sky-300/80 bg-white/75 px-4 py-2 text-sm font-medium text-[#124E9D] transition hover:bg-sky-100/80 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isResendingConfirmation
                                ? "Sende erneut..."
                                : "Bestätigungslink jetzt senden"}
                            </button>
                          </div>
                        )
                      ) : null}

                      {confirmed ? (
                        <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/75 px-4 py-3 text-sm text-emerald-700">
                          Deine E-Mail-Adresse wurde bestätigt. Dein Zugang wird nach Prüfung freigeschaltet.
                        </p>
                      ) : null}

                      {isConfirmingEmail ? (
                        <p className="rounded-2xl border border-[#0e51a0]/15 bg-[rgba(14,81,160,0.08)] px-4 py-3 text-sm text-[#124E9D]">
                          Deine E-Mail-Adresse wird gerade bestätigt...
                        </p>
                      ) : null}

                      {resendSuccessMessage ? (
                        <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/75 px-4 py-3 text-sm text-emerald-700">
                          {resendSuccessMessage}
                        </p>
                      ) : null}

                      {invited ? (
                        <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/75 px-4 py-3 text-sm text-emerald-700">
                          Einladung erfolgreich angenommen. Du kannst dich jetzt einloggen.
                        </p>
                      ) : null}

                      {reset ? (
                        <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/75 px-4 py-3 text-sm text-emerald-700">
                          Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt mit deinem neuen Passwort einloggen.
                        </p>
                      ) : null}
                    </div>

                    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                      <div>
                        <label
                          htmlFor="email"
                          className="mb-2 block text-sm font-medium text-[#5F6F84]"
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
                          className="w-full rounded-2xl border border-white/55 bg-[rgba(255,255,255,0.72)] px-4 py-3.5 text-[#23446F] shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-500 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/12 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.82)] [&:-webkit-autofill]:[-webkit-text-fill-color:#23446F]"
                          disabled={
                            isLoading || isConfirmingEmail || isResendingConfirmation
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="password"
                          className="mb-2 block text-sm font-medium text-[#5F6F84]"
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
                            className="w-full rounded-2xl border border-white/55 bg-[rgba(255,255,255,0.72)] px-4 py-3.5 pr-12 text-[#23446F] shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-500 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/12 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.82)] [&:-webkit-autofill]:[-webkit-text-fill-color:#23446F]"
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
                            className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-400 transition hover:text-[#124E9D] focus:outline-none focus-visible:text-[#124E9D]"
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
                          className="text-sm font-medium text-[#124E9D] transition hover:text-[#0b478b]"
                        >
                          Passwort vergessen?
                        </Link>
                      </div>

                      {error ? (
                        <div
                          role="alert"
                          aria-live="polite"
                          className="flex items-start gap-3 rounded-[1.35rem] border border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,246,255,0.96)_0%,rgba(232,242,255,0.9)_100%)] px-4 py-3.5 text-[#5F6F84] shadow-[0_18px_40px_rgba(14,81,160,0.08)]"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-white/75 text-[#124E9D] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
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
                            <p className="text-sm font-semibold leading-6 text-[#23446F]">
                              {error.title}
                            </p>
                            {error.detail ? (
                              <p className="mt-0.5 text-sm leading-6 text-[#5F6F84]">
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
                                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-sky-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-[#124E9D] transition hover:border-[#124E9D]/35 hover:text-[#124E9D] disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="th-reference-cta w-full"
                      >
                        {isLoading ? "Logge ein...!" : "Einloggen!"}
                      </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-3 border-t border-white/50 pt-6 text-sm text-[#5F6F84] sm:flex-row sm:items-center sm:justify-between">
                      <Link className="transition hover:text-[#124E9D]" href="/landing">
                        Zur Startseite
                      </Link>
                      <Link
                        className="font-medium text-[#124E9D] transition hover:text-[#5F6F84]"
                        href="/landing#preise"
                      >
                        Noch kein Konto? Jetzt starten
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
