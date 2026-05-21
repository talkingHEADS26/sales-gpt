"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from "next/navigation";

import { SiteBrand } from "@/components/site-brand";
import {
  LICENSE_PLANS,
  type FormErrors,
  type LicensePlan,
  validateRegisterForm,
} from "@/lib/auth-flows";
import { getPlanLabel } from "@/lib/copecart-products";
import {
  FRANCHISE_VERTICAL_OPTIONS,
  INDUSTRY_OPTIONS,
  type FranchiseVerticalKey,
  type IndustryKey,
} from "@/lib/industries";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

function RegisterPageContent() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [industryKey, setIndustryKey] = useState<IndustryKey>("fitness");
  const [franchiseVertical, setFranchiseVertical] =
    useState<FranchiseVerticalKey>("other");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licensePlan, setLicensePlan] = useState<LicensePlan>("solo");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setError("");
    setSuccess("");

    const values = {
      organizationName,
      firstName,
      lastName,
      username,
      industryKey,
      franchiseVertical,
      email,
      password,
      licensePlan,
    };

    const validationErrors = validateRegisterForm(values);

    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email.trim(),
          metadata: {
            registration_mode: "organization_signup",
            organization_name: values.organizationName.trim(),
            first_name: values.firstName.trim(),
            last_name: values.lastName.trim(),
            username: values.username.trim(),
            industry_key: values.industryKey,
            franchise_vertical:
              values.industryKey === "franchise"
                ? values.franchiseVertical
                : null,
            license_plan: values.licensePlan,
          },
          password,
        }),
      });
      const responseBody = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          responseBody.error ??
            "Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut."
        );
      }

      try {
        await fetch("/api/auth/new-signup-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: values.email.trim(),
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            organizationName: values.organizationName.trim(),
          }),
        });
      } catch (notificationError) {
        console.warn(
          "[register] Admin approval notification could not be triggered.",
          notificationError
        );
      }

      const supabase = getSupabaseBrowserClient();

      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email.trim(),
          password,
        });

        if (!signInError) {
          router.push("/dashboard");
          return;
        }
      }

      setSuccess("Registrierung erfolgreich.");
      router.push("/login?registered=1");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.";

      console.warn(`[register] Signup failed: ${message}`);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className={`${plusJakartaSans.className} min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_45%,#f4f9ff_100%)] text-[#707070]`}
    >
      <div className="relative isolate min-h-screen">
        <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[linear-gradient(135deg,rgba(14,81,160,0.18),rgba(14,81,160,0.03)_46%,rgba(255,255,255,0)_72%)]" />
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
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(234,148,19,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(234,148,19,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]"
              >
                Jetzt einloggen
              </Link>
            </div>
          </header>

          <section className="flex flex-1 items-center py-10 sm:py-14 lg:py-18">
            <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(500px,1.05fr)] lg:items-start">
              <div className="max-w-2xl lg:sticky lg:top-10">
                <div className="inline-flex items-center rounded-full border border-[#0e51a0]/15 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0e51a0] shadow-[0_10px_30px_rgba(14,81,160,0.08)] backdrop-blur">
                  Starte mit talkingHEADS Sales Trainer
                </div>
                <h1 className="mt-6 text-4xl font-semibold tracking-[-0.06em] text-balance text-[#707070] sm:text-5xl lg:text-6xl">
                  Baue dir den Trainingsvorsprung auf, der im Sales spürbar wird.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  Erstelle dein Konto und starte mit interaktivem Sales-Training, direktem Feedback und einer klaren Entwicklung hin zu besseren Abschlüssen.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    "Echte Gesprächssimulation",
                    "Direktes Feedback",
                    "Messbarer Sales-Fortschritt",
                  ].map((benefit) => (
                    <div
                      key={benefit}
                      className="rounded-2xl border border-white/80 bg-white/75 px-4 py-4 text-sm font-medium text-[#707070] shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur"
                    >
                      <span className="mb-3 block h-2 w-12 rounded-full bg-[#0e51a0]" />
                      {benefit}
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-[1.75rem] border border-white/80 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.07)] backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                    Für Teams mit Ambition
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Richte deine Organisation in wenigen Schritten ein, lege den passenden Lizenzplan fest und gib deinem Team einen konsistenten Rahmen für bessere Verkaufsgespräche.
                  </p>
                </div>
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
                        Organisation registrieren
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Richte dein Konto ein und starte mit einem Sales-Training, das Fortschritt sichtbar und Abschlussstärke trainierbar macht.
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      {!hasSupabaseEnv ? (
                        <p className="rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-800">
                          Die lokale Supabase-Konfiguration fehlt oder ist unvollständig.
                        </p>
                      ) : null}

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
                    </div>

                    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                      <div>
                        <label
                          htmlFor="organizationName"
                          className="mb-2 block text-sm font-medium text-[#707070]"
                        >
                          Organisation
                        </label>
                        <input
                          id="organizationName"
                          type="text"
                          value={organizationName}
                          onChange={(event) => setOrganizationName(event.target.value)}
                          placeholder="Beispiel GmbH"
                          autoComplete="organization"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                          disabled={isLoading}
                        />
                        {fieldErrors.organizationName ? (
                          <p className="mt-2 text-sm text-red-700">
                            {fieldErrors.organizationName}
                          </p>
                        ) : null}
                      </div>

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
                            placeholder="Max"
                            autoComplete="given-name"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                            disabled={isLoading}
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
                            placeholder="Mustermann"
                            autoComplete="family-name"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                            disabled={isLoading}
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
                          placeholder="max.mustermann"
                          autoComplete="username"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                          disabled={isLoading}
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
                          placeholder="name@example.com"
                          autoComplete="email"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                          disabled={isLoading}
                        />
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
                          placeholder="Mindestens 6 Zeichen"
                          autoComplete="new-password"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                          disabled={isLoading}
                        />
                        {fieldErrors.password ? (
                          <p className="mt-2 text-sm text-red-700">
                            {fieldErrors.password}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label
                          htmlFor="industryKey"
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Branche
                        </label>
                        <select
                          id="industryKey"
                          value={industryKey}
                          onChange={(event) => {
                            const nextIndustryKey = event.target.value as IndustryKey;
                            setIndustryKey(nextIndustryKey);
                            if (nextIndustryKey !== "franchise") {
                              setFranchiseVertical("other");
                            }
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                          disabled={isLoading}
                        >
                          {INDUSTRY_OPTIONS.map((industry) => (
                            <option key={industry.value} value={industry.value}>
                              {industry.label}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.industryKey ? (
                          <p className="mt-2 text-sm text-red-700">
                            {fieldErrors.industryKey}
                          </p>
                        ) : null}
                      </div>

                      {industryKey === "franchise" ? (
                        <div>
                          <label
                            htmlFor="franchiseVertical"
                            className="mb-2 block text-sm font-medium text-slate-700"
                          >
                            Franchise-Segment
                          </label>
                          <select
                            id="franchiseVertical"
                            value={franchiseVertical}
                            onChange={(event) =>
                              setFranchiseVertical(
                                event.target.value as FranchiseVerticalKey
                              )
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                            disabled={isLoading}
                          >
                            {FRANCHISE_VERTICAL_OPTIONS.map((segment) => (
                              <option key={segment.value} value={segment.value}>
                                {segment.label}
                              </option>
                            ))}
                          </select>
                          {fieldErrors.franchiseVertical ? (
                            <p className="mt-2 text-sm text-red-700">
                              {fieldErrors.franchiseVertical}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div>
                        <label
                          htmlFor="licensePlan"
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Lizenzplan
                        </label>
                        <select
                          id="licensePlan"
                          value={licensePlan}
                          onChange={(event) =>
                            setLicensePlan(event.target.value as LicensePlan)
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                          disabled={isLoading}
                        >
                          {LICENSE_PLANS.map((plan) => (
                            <option key={plan} value={plan}>
                              {getPlanLabel(plan)}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.licensePlan ? (
                          <p className="mt-2 text-sm text-red-700">
                            {fieldErrors.licensePlan}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(234,148,19,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(234,148,19,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? "Registriere..." : "Organisation registrieren"}
                      </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <Link className="transition hover:text-[#0e51a0]" href="/">
                        Zur Startseite
                      </Link>
                      <Link
                        className="font-medium text-[#707070] transition hover:text-[#0e51a0]"
                        href="/login"
                      >
                        Du hast bereits ein Konto? Jetzt einloggen
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

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
