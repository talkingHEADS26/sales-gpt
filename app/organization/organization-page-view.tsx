"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Roboto, Rubik } from "next/font/google";
import { useRouter } from "next/navigation";

import { InternalAppShell } from "@/components/internal-app-shell";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
});

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

type OrganizationMember = {
  completedSessionCount: number;
  completedSessionsByType: {
    appointment_setting: number;
    complaint_management: number;
    free_chat: number;
    full_sales: number;
    situation_coaching: number;
  };
  email: string | null;
  id: string;
  isActive: boolean;
  isSeatOccupied: boolean;
  lastActivityAt: string | null;
  name: string | null;
  platformRole: string | null;
  roleInOrg: string;
};

type OrganizationOverview = {
  copecart: {
    gracePeriodUntil: string | null;
    lastIpnEventAt: string | null;
    lastPaymentAt: string | null;
    orderId: string | null;
    paidUntil: string | null;
    paymentFailedAt: string | null;
    paymentFailureEmailSentAt: string | null;
    productId: string | null;
    subscriptionStatus: string;
  } | null;
  freeSeats: number;
  id: string;
  isActive: boolean;
  memberCount: number;
  members: OrganizationMember[];
  organizationName: string;
  packageLabel: string;
  pendingInvitationCount: number;
  pendingInvitations: {
    createdAt: string;
    email: string | null;
    expiresAt: string | null;
    id: string;
    roleToAssign: string;
  }[];
  planKey: string | null;
  seatLimit: number;
  seatLimitSource: "copecart_product" | "fallback" | "plan_key" | "stored";
  subscriptionStatus: string | null;
  validUntil: string | null;
};

type OverviewResponse = {
  error?: string;
  organization?: OrganizationOverview;
};

type CreateInvitationResponse = {
  email?: string;
  error?: string;
  expiresAt?: string;
  inviteId?: string;
  inviteLink?: string | null;
  mailDelivery?: "manual" | "sent";
  mailDeliveryReason?: "not_configured" | "send_failed" | null;
};

type InvitationActionResponse = {
  email?: string;
  error?: string;
  inviteId?: string;
  inviteLink?: string | null;
  mailDelivery?: "manual" | "sent";
  mailDeliveryReason?: "not_configured" | "send_failed" | null;
  success?: boolean;
};

type MemberActionResponse = {
  error?: string;
  removedUserId?: string;
  success?: boolean;
};

function getPlanLabel(planKey: string | null) {
  switch (planKey) {
    case "solo":
      return "Solo-Lizenz";
    case "team_3":
      return "Team Seat 3";
    case "team_5":
      return "Team Seat 5";
    case "enterprise":
      return "Enterprise";
    case "manual":
      return "Manuell";
    default:
      return "Nicht hinterlegt";
  }
}

function getRoleLabel(roleInOrg: string) {
  return roleInOrg === "admin" ? "Owner / Admin" : "Teammitglied";
}

function getSubscriptionStatusLabel(status: string | null) {
  if (!status) {
    return null;
  }

  switch (status) {
    case "manual_active":
      return "manual_active";
    case "manual_expired":
      return "Abgelaufen";
    default:
      return status;
  }
}

function getInviteDeliveryMessage(response: {
  email?: string;
  mailDelivery?: "manual" | "sent";
  mailDeliveryReason?: "not_configured" | "send_failed" | null;
}) {
  if (response.mailDelivery === "sent") {
    return `Einladungslink wurde an ${response.email} versendet.`;
  }

  if (response.mailDeliveryReason === "send_failed") {
    return `Einladung für ${response.email} erstellt. Der Mailversand war gerade nicht erfolgreich, daher steht der Link unten zum manuellen Teilen bereit.`;
  }

  return `Einladung für ${response.email} erstellt. Die Mail-Konfiguration fehlt aktuell, daher steht der Link unten zum manuellen Teilen bereit.`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Nicht hinterlegt";
  }

  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function OrganizationPageView() {
  const router = useRouter();
  const [organization, setOrganization] = useState<OrganizationOverview | null>(
    null
  );
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteActionKey, setInviteActionKey] = useState<string | null>(null);
  const [latestInviteLink, setLatestInviteLink] = useState("");
  const [memberActionKey, setMemberActionKey] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadOverview = async () => {
      if (!hasSupabaseEnv) {
        if (isActive) {
          setError(
            "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
          );
          setIsLoading(false);
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

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;
        const sessionUserId = session?.user?.id ?? null;

        if (!accessToken) {
          router.replace("/login");
          return;
        }

        const response = await fetch("/api/organization/overview", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const responseBody = (await response.json()) as OverviewResponse;

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          if (isActive) {
            setIsForbidden(true);
            setError(
              responseBody.error ??
                "Kein Zugriff auf diese Organisations-Verwaltung."
            );
            setIsLoading(false);
          }
          return;
        }

        if (!response.ok || !responseBody.organization) {
          throw new Error(
            responseBody.error ??
              "Die Organisations-Verwaltung konnte nicht geladen werden."
          );
        }

        if (isActive) {
          setCurrentUserId(sessionUserId);
          setOrganization(responseBody.organization);
          setIsForbidden(false);
          setError("");
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : "Die Organisations-Verwaltung konnte nicht geladen werden."
          );
          setIsLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      isActive = false;
    };
  }, [router]);

  const handleRevokeInvitation = async (inviteId: string) => {
    if (!hasSupabaseEnv || !organization) {
      return;
    }

    if (!window.confirm("Einladung wirklich zurückziehen?")) {
      return;
    }

    try {
      setInviteActionKey(`revoke:${inviteId}`);
      setError("");
      setInviteMessage("");
      setLatestInviteLink("");

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`/api/organization/invitations/${inviteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const responseBody = (await response.json()) as InvitationActionResponse;

      if (!response.ok) {
        throw new Error(
          responseBody.error ?? "Die Einladung konnte nicht widerrufen werden."
        );
      }

      setInviteMessage(
        `Einladung für ${responseBody.email ?? "die ausgewählte Adresse"} wurde widerrufen.`
      );

      setOrganization((currentOrganization) =>
        currentOrganization
          ? {
              ...currentOrganization,
              freeSeats: Math.min(
                currentOrganization.freeSeats + 1,
                Math.max(
                  currentOrganization.seatLimit - currentOrganization.members.length,
                  0
                )
              ),
              pendingInvitationCount: Math.max(
                currentOrganization.pendingInvitationCount - 1,
                0
              ),
              pendingInvitations: currentOrganization.pendingInvitations.filter(
                (invitation) => invitation.id !== inviteId
              ),
            }
          : currentOrganization
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Einladung konnte nicht widerrufen werden."
      );
    } finally {
      setInviteActionKey(null);
    }
  };

  const handleResendInvitation = async (inviteId: string) => {
    if (!hasSupabaseEnv || !organization) {
      return;
    }

    try {
      setInviteActionKey(`resend:${inviteId}`);
      setError("");
      setInviteMessage("");
      setLatestInviteLink("");

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `/api/organization/invitations/${inviteId}/resend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const responseBody = (await response.json()) as InvitationActionResponse;

      if (!response.ok) {
        throw new Error(
          responseBody.error ??
            "Die Einladung konnte nicht erneut versendet werden."
        );
      }

      setInviteMessage(
        responseBody.mailDelivery === "sent"
          ? `Einladungslink wurde erneut an ${responseBody.email} versendet.`
          : responseBody.mailDeliveryReason === "send_failed"
            ? `Einladung für ${responseBody.email} bleibt aktiv. Der erneute Mailversand war gerade nicht erfolgreich, daher steht der Link unten zum manuellen Teilen bereit.`
            : `Einladung für ${responseBody.email} bleibt aktiv. Die Mail-Konfiguration fehlt aktuell, daher steht der Link unten zum manuellen Teilen bereit.`
      );
      setLatestInviteLink(responseBody.inviteLink ?? "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Einladung konnte nicht erneut versendet werden."
      );
    } finally {
      setInviteActionKey(null);
    }
  };

  const handleUserStatusUpdate = async (userId: string, isActive: boolean) => {
    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    try {
      setUpdatingKey(userId);
      setError("");

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`/api/organization/members/${userId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      const responseBody = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          responseBody.error ?? "Der Mitgliederstatus konnte nicht aktualisiert werden."
        );
      }

      setOrganization((currentOrganization) =>
        currentOrganization
          ? {
              ...currentOrganization,
              members: currentOrganization.members.map((member) =>
                member.id === userId ? { ...member, isActive } : member
              ),
            }
          : currentOrganization
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Mitgliederstatus konnte nicht aktualisiert werden."
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!hasSupabaseEnv || !organization) {
      return;
    }

    if (!window.confirm("Mitglied wirklich entfernen?")) {
      return;
    }

    try {
      setMemberActionKey(userId);
      setError("");
      setInviteMessage("");
      setLatestInviteLink("");

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`/api/organization/members/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const responseBody = (await response.json()) as MemberActionResponse;

      if (!response.ok) {
        throw new Error(
          responseBody.error ?? "Das Mitglied konnte nicht entfernt werden."
        );
      }

      setInviteMessage("Mitglied wurde aus der Organisation entfernt.");

      setOrganization((currentOrganization) =>
        currentOrganization
          ? {
              ...currentOrganization,
              freeSeats: Math.min(
                currentOrganization.freeSeats + 1,
                currentOrganization.seatLimit
              ),
              memberCount: Math.max(currentOrganization.memberCount - 1, 0),
              members: currentOrganization.members.filter(
                (member) => member.id !== userId
              ),
            }
          : currentOrganization
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Mitglied konnte nicht entfernt werden."
      );
    } finally {
      setMemberActionKey(null);
    }
  };

  const handleCreateInvitation = async () => {
    if (!hasSupabaseEnv || !organization) {
      return;
    }

    try {
      setIsCreatingInvite(true);
      setError("");
      setInviteMessage("");
      setLatestInviteLink("");

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error(
          "Supabase konnte nicht initialisiert werden. Prüfe die Konfiguration."
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/organization/invitations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const responseBody = (await response.json()) as CreateInvitationResponse;

      if (!response.ok) {
        throw new Error(
          responseBody.error ?? "Die Einladung konnte nicht erstellt werden."
        );
      }

      setInviteEmail("");
      setInviteMessage(getInviteDeliveryMessage(responseBody));
      setLatestInviteLink(responseBody.inviteLink ?? "");

      setOrganization((currentOrganization) =>
        currentOrganization
          ? {
              ...currentOrganization,
              freeSeats: Math.max(currentOrganization.freeSeats - 1, 0),
              pendingInvitationCount: currentOrganization.pendingInvitationCount + 1,
              pendingInvitations: [
                {
                  createdAt: new Date().toISOString(),
                  email: responseBody.email ?? inviteEmail.trim().toLowerCase(),
                  expiresAt: responseBody.expiresAt ?? null,
                  id: responseBody.inviteId ?? crypto.randomUUID(),
                  roleToAssign: "member",
                },
                ...currentOrganization.pendingInvitations,
              ],
            }
          : currentOrganization
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Einladung konnte nicht erstellt werden."
      );
    } finally {
      setIsCreatingInvite(false);
    }
  };

  return (
    <InternalAppShell>
      <div className={`${roboto.className} bg-white`}>
          <section className="flex flex-1 items-start py-10 sm:py-14">
            <div className="w-full rounded-[2rem] border border-[#0b478b] bg-[#0E51A0] p-5 shadow-[0_24px_60px_rgba(14,81,160,0.28)] sm:p-6 lg:p-8">
              <div className="rounded-[1.6rem] border border-white/20 bg-transparent p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#dce8fb]">
                      Team-Verwaltung
                    </p>
                    <h1 className={`${rubik.className} mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl`}>
                      Verwalte dein Team und deine verfügbaren Seats.
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-[#dce8fb] sm:text-lg sm:leading-8">
                      Behalte im Blick, wie viele Plätze belegt sind, welche Mitglieder aktiv sind und wie deine Organisation aktuell aufgestellt ist.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {organization
                      ? [
                          [`${organization.seatLimit}`, "Seats"],
                          [`${organization.memberCount}`, "Belegt"],
                          [`${organization.freeSeats}`, "Frei"],
                        ].map(([value, label]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-white/20 bg-[#0b478b] px-5 py-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                          >
                            <p className="text-2xl font-semibold tracking-[-0.04em]">
                              {value}
                            </p>
                            <p className="mt-1 text-sm text-[#dce8fb]">{label}</p>
                          </div>
                        ))
                      : null}
                  </div>
                </div>

                {isLoading ? (
                  <p className="mt-8 text-base leading-7 text-[#dce8fb]">
                    Organisations-Verwaltung wird geladen...
                  </p>
                ) : null}

                {!isLoading && isForbidden ? (
                  <div className="mt-8 rounded-[1.75rem] border border-amber-200 bg-amber-50/95 p-6">
                    <h2 className="text-xl font-semibold text-[#707070]">
                      Kein Zugriff auf diese Verwaltung
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-amber-900/80">
                      {error ||
                        "Dieser Account hat keine Owner-/Admin-Berechtigung innerhalb einer Organisation."}
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(234,148,19,0.35)]"
                        href="/dashboard"
                      >
                        Zurück zum Dashboard
                      </Link>
                    </div>
                  </div>
                ) : null}

                {!isLoading && !isForbidden && error ? (
                  <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                {!isLoading && !isForbidden && organization ? (
                  <div className="mt-8 space-y-6">
                    <section className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#0e51a0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                              {organization.packageLabel || getPlanLabel(organization.planKey)}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                organization.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {organization.isActive ? "Organisation aktiv" : "Organisation gesperrt"}
                            </span>
                            {organization.subscriptionStatus ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {getSubscriptionStatusLabel(organization.subscriptionStatus)}
                              </span>
                            ) : null}
                          </div>

                          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#707070]">
                            {organization.organizationName}
                          </h2>
                          <p className="mt-3 text-sm leading-7 text-slate-600">
                            {organization.seatLimit > 1
                              ? "Du kannst die Besetzung deiner Team-Seats hier zentral verwalten."
                              : "Dein aktueller Plan ist auf einen Einzelplatz ausgelegt. Team-Seats sind in diesem Modell nicht vorgesehen."}
                          </p>
                          {organization.copecart ? (
                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                CopeCart Abo-Status
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-sm text-slate-600">
                                  Order ID: {organization.copecart.orderId ?? "Nicht hinterlegt"}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Produkt ID: {organization.copecart.productId ?? "Nicht hinterlegt"}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Status: {organization.copecart.subscriptionStatus}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Bezahlt bis: {formatDateTime(organization.copecart.paidUntil)}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Letzte Zahlung: {formatDateTime(organization.copecart.lastPaymentAt)}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Letztes IPN: {formatDateTime(organization.copecart.lastIpnEventAt)}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Karenzfrist bis: {formatDateTime(organization.copecart.gracePeriodUntil)}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Zahlung fehlgeschlagen am: {formatDateTime(organization.copecart.paymentFailedAt)}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Warnmail gesendet am: {formatDateTime(organization.copecart.paymentFailureEmailSentAt)}
                                </p>
                              </div>
                            </div>
                          ) : null}
                          {organization.planKey === "manual" ? (
                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Manuell
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-sm text-slate-600">
                                  Gueltig bis: {formatDateTime(organization.validUntil)}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Status: {getSubscriptionStatusLabel(organization.subscriptionStatus)}
                                </p>
                              </div>
                            </div>
                          ) : null}
                          {organization.seatLimitSource !== "stored" ? (
                            <p className="mt-4 text-sm leading-7 text-amber-700">
                              Seat-Limit wird aktuell aus den verfügbaren Paketdaten abgeleitet.
                            </p>
                          ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:w-[32rem]">
                          {[
                            [organization.packageLabel, "Paket"],
                            [`${organization.seatLimit}`, "Seat-Limit"],
                            [`${organization.memberCount}`, "Aktive Nutzer"],
                            [`${organization.pendingInvitationCount}`, "Offene Einladungen"],
                            [`${organization.freeSeats}`, "Verfügbare Seats"],
                          ].map(([value, label]) => (
                            <div
                              key={label}
                              className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4"
                            >
                              <p className="text-lg font-semibold text-[#707070]">
                                {value}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                          <h3 className="text-xl font-semibold text-[#707070]">
                            Team per E-Mail einladen
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            Offene Einladungen zählen gegen dein Seat-Limit. Erst wenn eine Einladung widerrufen, angenommen oder ungültig wird, wird der Platz wieder frei.
                          </p>
                        </div>
                        <span className="rounded-full bg-[#0e51a0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                          {organization.packageLabel || getPlanLabel(organization.planKey)}
                        </span>
                      </div>

                      {organization.seatLimit <= 1 ? (
                        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
                          Mit der Solo-Lizenz ist keine Team-Einladung verfügbar.
                        </div>
                      ) : (
                        <>
                          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(event) => setInviteEmail(event.target.value)}
                              placeholder="name@unternehmen.de"
                              className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#707070] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10"
                              disabled={isCreatingInvite || organization.freeSeats <= 0}
                            />
                            <button
                              type="button"
                              onClick={() => void handleCreateInvitation()}
                              disabled={
                                isCreatingInvite ||
                                !inviteEmail.trim() ||
                                organization.freeSeats <= 0
                              }
                              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f6ab2c_0%,#EA9413_52%,#db8302_100%)] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(234,148,19,0.35)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isCreatingInvite
                                ? "Erstelle Einladung..."
                                : "Einladungslink senden"}
                            </button>
                          </div>

                          {inviteMessage ? (
                            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                              {inviteMessage}
                            </p>
                          ) : null}

                          {latestInviteLink ? (
                            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                              <p className="text-sm font-medium text-slate-500">
                                Einladungslink
                              </p>
                              <p className="mt-2 break-all text-sm text-[#707070]">
                                {latestInviteLink}
                              </p>
                            </div>
                          ) : null}
                        </>
                      )}

                      {organization.pendingInvitations.length > 0 ? (
                        <div className="mt-6 space-y-3">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Offene Einladungen
                          </h4>
                          {organization.pendingInvitations.map((invitation) => (
                            <article
                              key={invitation.id}
                              className="rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#707070]">
                                    {invitation.email ?? "Keine E-Mail gefunden"}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Rolle: {invitation.roleToAssign} · gültig bis{" "}
                                    {invitation.expiresAt
                                      ? new Date(invitation.expiresAt).toLocaleDateString("de-DE")
                                      : "offen"}
                                  </p>
                                </div>
                                <div className="flex flex-col items-start gap-3 sm:items-end">
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                                    Pending
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleResendInvitation(invitation.id)
                                      }
                                      disabled={
                                        inviteActionKey !== null || isCreatingInvite
                                      }
                                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-[#0e51a0]/30 hover:text-[#0e51a0] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {inviteActionKey === `resend:${invitation.id}`
                                        ? "Sende erneut..."
                                        : "Erneut senden"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleRevokeInvitation(invitation.id)
                                      }
                                      disabled={
                                        inviteActionKey !== null || isCreatingInvite
                                      }
                                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {inviteActionKey === `revoke:${invitation.id}`
                                        ? "Widerrufe..."
                                        : "Widerrufen"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </section>

                    <section className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-[#707070]">
                            Teammitglieder
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Übersicht über besetzte Seats und den aktuellen Status.
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {organization.members.length} aktiv zugewiesen
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {organization.members.map((member) => {
                          const adminCount = organization.members.filter(
                            (entry) => entry.roleInOrg === "admin"
                          ).length;
                          const isProtectedOwner =
                            member.id === currentUserId ||
                            (member.roleInOrg === "admin" && adminCount <= 1);
                          const isReadOnlySolo = organization.seatLimit <= 1;
                          const isActionDisabled =
                            updatingKey === member.id ||
                            memberActionKey === member.id ||
                            isProtectedOwner ||
                            isReadOnlySolo;

                          return (
                            <article
                              key={member.id}
                              className="rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-[#707070]">
                                      {member.name ?? "Ohne Namen"}
                                    </p>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                        member.isActive
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-amber-50 text-amber-700"
                                      }`}
                                    >
                                      {member.isActive ? "Aktiv" : "Gesperrt"}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                      {getRoleLabel(member.roleInOrg)}
                                    </span>
                                    {member.isSeatOccupied ? (
                                      <span className="rounded-full bg-[#0e51a0]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0e51a0]">
                                        Seat belegt
                                      </span>
                                    ) : null}
                                    {isProtectedOwner ? (
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Geschützt
                                      </span>
                                    ) : null}
                                  </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                      {member.email ?? "Keine E-Mail gefunden"}
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-500">
                                      Completed Sessions: {member.completedSessionCount}
                                    </p>
                                  </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleUserStatusUpdate(
                                        member.id,
                                        !member.isActive
                                      )
                                    }
                                    disabled={isActionDisabled}
                                    className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                                      member.isActive
                                        ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                        : "bg-[#0e51a0] text-white hover:bg-[#0b478b]"
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                  >
                                    {updatingKey === member.id
                                      ? "Aktualisiere..."
                                      : member.isActive
                                        ? "Mitglied sperren"
                                        : "Mitglied entsperren"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleRemoveMember(member.id)
                                    }
                                    disabled={isActionDisabled}
                                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {memberActionKey === member.id
                                      ? "Entferne..."
                                      : "Entfernen"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {organization.freeSeats > 0 ? (
                        <div className="mt-5 rounded-2xl border border-dashed border-[#0e51a0]/25 bg-[#0e51a0]/4 px-4 py-4 text-sm leading-7 text-slate-600">
                          {organization.freeSeats === 1
                            ? "Aktuell ist noch 1 Seat frei."
                            : `Aktuell sind noch ${organization.freeSeats} Seats frei.`}
                        </div>
                      ) : null}
                    </section>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
      </div>
    </InternalAppShell>
  );
}
