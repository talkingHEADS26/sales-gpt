"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from "next/navigation";

import { SiteBrand } from "@/components/site-brand";
import {
  type FormErrors,
  type InvitationLookup,
  validateInviteAcceptForm,
} from "@/lib/auth-flows";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

type InviteAcceptFormProps = {
  token: string;
};

export function InviteAcceptForm({ token }: InviteAcceptFormProps) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationLookup | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadInvitation = async () => {
      if (!hasSupabaseEnv) {
        if (isActive) {
          setError(
            "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
          );
          setIsLoadingInvitation(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();

        if (!supabase) {
          throw new Error(
            "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
          );
        }

        const { data, error: invitationError } = await supabase.rpc(
          "get_invitation_by_token",
          { p_token: token }
        );

        if (invitationError) {
          throw invitationError;
        }

        void data;

        const response = await fetch(`/api/invitations/${token}`);
        const responseBody = (await response.json()) as {
          error?: string;
          invitation?: InvitationLookup;
        };

        const invitationRow = responseBody.invitation ?? null;

        if (!invitationRow) {
          throw new Error("Einladung nicht gefunden.");
        }

        if (isActive) {
          setInvitation(invitationRow);
          setEmail(invitationRow.email ?? "");
          setError(invitationRow.is_valid ? "" : invitationRow.error_message ?? "");
          setIsLoadingInvitation(false);
        }
      } catch (err) {
        if (isActive) {
          const message =
            err instanceof Error
              ? err.message
              : "Die Einladung konnte nicht geladen werden.";

          setError(message);
          setIsLoadingInvitation(false);
        }
      }
    };

    void loadInvitation();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setError("");

    const effectiveEmail = invitation?.email ?? email;
    const validationErrors = validateInviteAcceptForm({
      firstName,
      lastName,
      username,
      email: effectiveEmail,
      password,
    });

    if (!invitation?.is_valid) {
      setError(invitation?.error_message ?? "Diese Einladung ist ungueltig.");
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: effectiveEmail.trim(),
          metadata: {
            registration_mode: "invitation_accept",
            invitation_token: token,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: username.trim(),
          },
          password,
        }),
      });
      const responseBody = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          responseBody.error ?? "Die Einladung konnte nicht angenommen werden."
        );
      }

      router.push("/login?invited=1");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Die Einladung konnte nicht angenommen werden.";

      setError(message);
    } finally {
      setIsSubmitting(false);
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
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0e51a0] px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(14,81,160,0.32)] transition hover:bg-[#0b478b]"
            >
              Zum Login
            </Link>
          </header>

          <section className="flex flex-1 items-center py-10 sm:py-14 lg:py-18">
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)] lg:items-start">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-[#0e51a0]/15 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0e51a0] shadow-[0_10px_30px_rgba(14,81,160,0.08)] backdrop-blur">
                  Team-Einladung
                </div>
                <h1 className="mt-6 text-4xl font-semibold tracking-[-0.06em] text-[#707070] sm:text-5xl lg:text-6xl">
                  Du wurdest zu{" "}
                  {invitation?.organization_name ?? "einem talkingHEADS Sales Trainer-Team"} eingeladen.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  Lege dein Konto an und starte direkt in die gemeinsame Sales-Trainingsumgebung.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6">
                <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-8">
                  <div className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                      talkingHEADS Sales Trainer
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#707070]">
                      Einladung annehmen
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Deine Organisation ist bereits hinterlegt. Du musst nur noch dein persönliches Konto anlegen.
                    </p>
                  </div>

                  {isLoadingInvitation ? (
                    <p className="text-sm text-slate-600">Einladung wird geladen...</p>
                  ) : null}

                  {!isLoadingInvitation && invitation?.is_valid ? (
                    <>
                      <div className="mb-6 rounded-2xl border border-white/80 bg-slate-50/80 p-5">
                        <p className="text-sm font-medium text-slate-500">Organisation</p>
                        <p className="mt-1 text-base font-semibold text-[#707070]">
                          {invitation.organization_name}
                        </p>
                        <p className="mt-4 text-sm font-medium text-slate-500">Rolle</p>
                        <p className="mt-1 text-base font-semibold text-[#707070]">
                          {invitation.role_to_assign}
                        </p>
                      </div>

                      <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-medium text-[#707070]"
                  >
                    Vorname
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    autoComplete="given-name"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.firstName ? (
                    <p className="mt-2 text-sm text-red-700">
                      {fieldErrors.firstName}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-2 block text-sm font-medium text-[#707070]"
                  >
                    Nachname
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    autoComplete="family-name"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.lastName ? (
                    <p className="mt-2 text-sm text-red-700">
                      {fieldErrors.lastName}
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-[#707070]"
                  >
                    Username
                  </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                  disabled={isSubmitting}
                />
                {fieldErrors.username ? (
                  <p className="mt-2 text-sm text-red-700">
                    {fieldErrors.username}
                  </p>
                ) : null}
              </div>

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
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                  disabled={isSubmitting || Boolean(invitation.email)}
                />
                {invitation.email ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Diese Einladung ist an eine feste E-Mail-Adresse gebunden.
                  </p>
                ) : null}
                {fieldErrors.email ? (
                  <p className="mt-2 text-sm text-red-700">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-[#707070]"
                  >
                    Passwort
                  </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                  disabled={isSubmitting}
                />
                {fieldErrors.password ? (
                  <p className="mt-2 text-sm text-red-700">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0e51a0] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(14,81,160,0.32)] transition hover:bg-[#0b478b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Lege Konto an..." : "Einladung annehmen"}
              </button>
            </form>
                    </>
                  ) : null}

                  {!isLoadingInvitation && (!invitation || !invitation.is_valid) ? (
                    <div className="space-y-4">
                      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error || invitation?.error_message || "Diese Einladung ist ungültig."}
                      </p>
                      <div className="flex gap-4 text-sm">
                        <Link className="transition hover:text-[#0e51a0]" href="/login">
                          Zum Login
                        </Link>
                        <Link className="transition hover:text-[#0e51a0]" href="/">
                          Zur Startseite
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
