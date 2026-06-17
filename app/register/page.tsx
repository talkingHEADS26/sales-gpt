"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteLogo } from "@/components/site-brand";
import {
  LICENSE_PLANS,
  type FormErrors,
  type LicensePlan,
  validateInviteAcceptForm,
  validateRegisterForm,
} from "@/lib/auth-flows";
import { getPlanLabel } from "@/lib/copecart-products";
import {
  FRANCHISE_VERTICAL_OPTIONS,
  INDUSTRY_OPTIONS,
  type FranchiseVerticalKey,
  type IndustryKey,
} from "@/lib/industries";
import { hasSupabaseEnv } from "@/lib/supabase";

type SearchParamsLike = Pick<URLSearchParams, "get">;

function readSearchParam(searchParams: SearchParamsLike, ...keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function resolveLicensePlan(value: string | null) {
  return value && LICENSE_PLANS.includes(value as LicensePlan)
    ? (value as LicensePlan)
    : "solo";
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLicensePlan = resolveLicensePlan(
    readSearchParam(searchParams, "licensePlan", "license_plan", "plan")
  );
  const invitationToken = readSearchParam(
    searchParams,
    "invitation_token",
    "invitationToken",
    "invite_token"
  );
  const copecartProductId = readSearchParam(
    searchParams,
    "copecart_product_id",
    "cope_cart_product_id",
    "product_id",
    "productId"
  );
  const copecartOrderId = readSearchParam(
    searchParams,
    "copecart_order_id",
    "cope_cart_order_id",
    "order_id",
    "orderId",
    "transaction_id",
    "transactionId"
  );
  const copecartCustomerEmail = readSearchParam(
    searchParams,
    "copecart_customer_email",
    "cope_cart_customer_email",
    "customer_email",
    "customerEmail",
    "email"
  );
  const isInvitationSignup = Boolean(invitationToken);
  const cameFromCopeCart =
    Boolean(copecartProductId) ||
    Boolean(copecartOrderId) ||
    Boolean(copecartCustomerEmail);
  const isCopeCartBoundSignup = cameFromCopeCart && !isInvitationSignup;
  const [invitationOrganizationName, setInvitationOrganizationName] = useState("");
  const [invitation, setInvitation] = useState<{
    email: string | null;
    error_message: string | null;
    is_valid: boolean;
    organization_name: string | null;
  } | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(isInvitationSignup);
  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [industryKey, setIndustryKey] = useState<IndustryKey>("fitness");
  const [franchiseVertical, setFranchiseVertical] =
    useState<FranchiseVerticalKey>("other");
  const [email, setEmail] = useState(copecartCustomerEmail ?? "");
  const [password, setPassword] = useState("");
  const [licensePlan, setLicensePlan] = useState<LicensePlan>(initialLicensePlan);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!invitationToken) {
      setIsLoadingInvitation(false);
      return () => {
        isActive = false;
      };
    }

    const loadInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${invitationToken}`);
        const responseBody = (await response.json()) as {
          error?: string;
          invitation?: {
            email: string | null;
            error_message: string | null;
            is_valid: boolean;
            organization_name: string | null;
          };
        };

        const invitationRow = responseBody.invitation ?? null;

        if (!invitationRow) {
          throw new Error(responseBody.error ?? "Einladung nicht gefunden.");
        }

        if (isActive) {
          setInvitation(invitationRow);
          setInvitationOrganizationName(invitationRow.organization_name ?? "");
          setOrganizationName(invitationRow.organization_name ?? "");
          setEmail(invitationRow.email ?? "");
          setError(invitationRow.is_valid ? "" : invitationRow.error_message ?? "");
          setIsLoadingInvitation(false);
        }
      } catch (err) {
        if (!isActive) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Die Einladung konnte nicht geladen werden."
        );
        setIsLoadingInvitation(false);
      }
    };

    void loadInvitation();

    return () => {
      isActive = false;
    };
  }, [invitationToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setError("");
    setSuccess("");

    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    if (isInvitationSignup && !invitation?.is_valid) {
      setError(invitation?.error_message ?? "Diese Einladung ist ungültig.");
      return;
    }

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

    const validationErrors = isInvitationSignup
      ? validateInviteAcceptForm({
          firstName,
          lastName,
          username,
          email,
          password,
        })
      : validateRegisterForm(values);

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
          metadata: isInvitationSignup
            ? {
                invitation_token: invitationToken,
                registration_mode: "invitation_accept",
                first_name: values.firstName.trim(),
                last_name: values.lastName.trim(),
                username: values.username.trim(),
              }
            : {
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
                cope_cart_product_id: copecartProductId,
                cope_cart_order_id: copecartOrderId,
                cope_cart_customer_email: values.email.trim(),
                customer_email: values.email.trim(),
              },
          password,
        }),
      });
      const responseBody = (await response.json()) as {
        confirmationEmailError?: string | null;
        confirmationEmailSent?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          responseBody.error ??
            "Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut."
        );
      }

      if (!isInvitationSignup) {
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
      }

      const encodedEmail = encodeURIComponent(values.email.trim());
      const encodedConfirmationMailError = encodeURIComponent(
        responseBody.confirmationEmailError ?? ""
      );
      const confirmationMailStatus =
        responseBody.confirmationEmailSent === false ? "0" : "1";

      setSuccess(
        isInvitationSignup
          ? "Einladung erfolgreich angenommen. Du kannst dich jetzt anmelden."
          : responseBody.confirmationEmailSent === false
            ? "Registrierung erfolgreich. Der Bestätigungslink konnte nicht automatisch gesendet werden."
            : "Registrierung erfolgreich. Bitte bestätige jetzt deine E-Mail-Adresse."
      );
      router.push(
        isInvitationSignup
          ? "/login?invited=1"
          : `/login?registered=1&confirm_mail=${confirmationMailStatus}&confirm_mail_error=${encodedConfirmationMailError}&email=${encodedEmail}`
      );
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

          <Link className="btn btn-primary site-header__cta" href="/login">
            Einloggen!
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
              <Link href="/login" className="btn btn-primary mobile-nav__cta">
                Einloggen!
              </Link>
            </nav>
          </details>
        </div>
      </header>

      <section className="register-hero">
        <div className="landing-container register-hero__inner">
          <div className="register-hero__copy">
            <div className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white shadow-[0_8px_20px_rgba(7,47,107,0.12)]">
                  Sales-Training für planbare Abschlüsse
                </div>
                <h1 className="mt-5 text-balance font-heading text-3xl font-normal tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
                  Mach dein Team im Verkauf sicher, strukturiert und überzeugend.
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/88 sm:text-lg sm:leading-8 lg:mx-0">
                  Erstelle in wenigen Minuten eure Organisation und starte mit KI-gestützten Gesprächssimulationen, klarem Feedback und messbarer Entwicklung im Vertrieb.
                </p>

                <div className="mx-auto mt-6 max-w-2xl rounded-[1.25rem] border border-white/18 bg-white/10 p-5 shadow-[0_10px_24px_rgba(7,47,107,0.12)] backdrop-blur-md lg:mx-0">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-white">
                    Für ambitionierte Vertriebsteams
                  </p>
                  <p className="mt-4 text-sm leading-7 text-white/80">
                    Lege die Organisation an, wähle den passenden Lizenzplan und schaffe einen einheitlichen Trainingsstandard für bessere Beratung und mehr Abschlüsse.
                  </p>
                </div>
              </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="w-full">
          <div className="mx-auto grid w-full gap-10">
            <div className="register-form-card relative mx-auto w-full max-w-3xl">
                <div className="rounded-[2rem] border border-[#dbe7f8] bg-white p-5 shadow-[0_18px_44px_rgba(14,81,160,0.08)] sm:p-6">
                  <div className="rounded-[1.6rem] border border-[#eef3f9] bg-white p-6 sm:p-8">
                    <div className="text-center">
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#0E51A0]">
                        talkingHEADS Registration
                      </p>
                      <h2 className="mt-4 font-heading text-3xl font-normal tracking-[-0.03em] text-[#0E51A0]">
                        Konto für deine Organisation erstellen
                      </h2>
                      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#707070]">
                        {isInvitationSignup
                          ? "Lege jetzt dein persönliches Konto an. Organisation und E-Mail sind bereits für deine Einladung hinterlegt."
                          : "Fülle die Angaben aus und starte direkt mit einem Trainingssystem, das Verkaufsgespräche verbessert und Abschlusssicherheit aufbaut."}
                      </p>
                      {isInvitationSignup ? (
                        <p className="mx-auto mt-4 inline-flex rounded-full border border-[#dbe7f8] bg-[#f7fbff] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#0E51A0]">
                          Einladung erkannt, bitte Konto vervollständigen.
                        </p>
                      ) : cameFromCopeCart ? (
                        <p className="mx-auto mt-4 inline-flex rounded-full border border-[#dbe7f8] bg-[#f7fbff] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#0E51A0]">
                          CopeCart-Kauf erkannt, Plan ist vorausgewählt.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-6 space-y-3">
                      {isInvitationSignup && isLoadingInvitation ? (
                        <p className="rounded-2xl border border-[#dbe7f8] bg-[#f7fbff] px-4 py-3 text-sm text-[#707070]">
                          Einladung wird geladen...
                        </p>
                      ) : null}

                      {!hasSupabaseEnv ? (
                        <p className="rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-[#707070]">
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
                      {isInvitationSignup ? (
                        <div className="rounded-2xl border border-[#dbe7f8] bg-[#f7fbff] px-4 py-4">
                          <p className="text-sm font-medium text-[#0E51A0]">
                            Einladung für
                          </p>
                          <p className="mt-1 text-base font-semibold text-[#707070]">
                            {invitationOrganizationName || "Deine Organisation"}
                          </p>
                          <p className="mt-3 text-sm text-[#707070]">
                            Eingeladene E-Mail:
                            <span className="ml-2 font-medium text-slate-700">
                              {email || "nicht gesetzt"}
                            </span>
                          </p>
                        </div>
                      ) : (
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
                      )}

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
                          disabled={isLoading || isInvitationSignup}
                          readOnly={isInvitationSignup}
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

                      {!isInvitationSignup ? (
                        <>
                          <div>
                            <label
                              htmlFor="industryKey"
                              className="mb-2 block text-sm font-medium text-[#707070]"
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
                                className="mb-2 block text-sm font-medium text-[#707070]"
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
                              className="mb-2 block text-sm font-medium text-[#707070]"
                            >
                              Lizenzplan
                            </label>
                            {isCopeCartBoundSignup ? (
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                                {getPlanLabel(licensePlan)}
                                <p className="mt-1 text-xs text-slate-500">
                                  Dieser Plan ist an deinen CopeCart-Kauf gebunden.
                                </p>
                              </div>
                            ) : (
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
                            )}
                            {fieldErrors.licensePlan ? (
                              <p className="mt-2 text-sm text-red-700">
                                {fieldErrors.licensePlan}
                              </p>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="th-reference-cta w-full"
                      >
                        {isLoading
                          ? "Konto wird erstellt...!"
                          : isInvitationSignup
                            ? "Einladung annehmen!"
                            : "Jetzt Organisation anlegen!"}
                      </button>
                    </form>

                    <div className="mt-6 flex flex-col gap-3 border-t border-[#eef3f9] pt-6 text-sm text-[#707070] sm:flex-row sm:items-center sm:justify-between">
                      <Link className="transition hover:text-[#0e51a0]" href="/landing">
                        Zur Startseite
                      </Link>
                      <Link
                        className="font-medium text-[#0e51a0] transition hover:text-[#707070]"
                        href="/login"
                      >
                        Bereits registriert? Hier einloggen
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      <SiteFooter />
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
