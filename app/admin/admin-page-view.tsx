"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { useRouter } from "next/navigation";

import { InternalAppShell } from "@/components/internal-app-shell";
import {
  FRANCHISE_VERTICAL_OPTIONS,
  type FranchiseVerticalKey,
  INDUSTRY_OPTIONS,
  type IndustryKey,
} from "@/lib/industries";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

type AdminMember = {
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
  name: string | null;
  platformRole: string | null;
  roleInOrg: string;
  signupOrder: {
    amount: string | null;
    customerEmail: string | null;
    firstName: string | null;
    lastName: string | null;
    orderId: string | null;
    vatAmount: string | null;
  } | null;
};

type AdminOrganization = {
  availableSeats: number;
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
  createdAt: string;
  franchiseVertical: FranchiseVerticalKey | null;
  id: string;
  industryKey: IndustryKey;
  industryLocked: boolean;
  isActive: boolean;
  memberCount: number;
  members: AdminMember[];
  organizationName: string;
  packageLabel: string;
  pendingInvitationCount: number;
  owner: {
    email: string | null;
    id: string | null;
    name: string | null;
    signupOrder: AdminMember["signupOrder"];
  };
  planKey: string | null;
  promptProfileKey: string | null;
  seatLimit: number;
  seatLimitSource: "copecart_product" | "fallback" | "plan_key" | "stored";
  subscriptionStatus: string | null;
  validUntil: string | null;
};

type AdminSystemEvent = {
  alertSentAt: string | null;
  createdAt: string;
  environment: string | null;
  id: string;
  message: string;
  severity: "critical" | "error" | "info" | "warning";
  source: string;
};

type OverviewResponse = {
  error?: string;
  organizations?: AdminOrganization[];
  systemEvents?: AdminSystemEvent[];
};

type ActionResponse = {
  error?: string;
  franchiseVertical?: FranchiseVerticalKey | null;
  id?: string;
  industryKey?: IndustryKey;
  isActive?: boolean;
  organizationId?: string;
  promptProfileKey?: string | null;
  success?: boolean;
  userId?: string;
};

type CleanupResponse = {
  deletedSessions: number;
  dryRun: boolean;
  error?: string;
  keptCompletedSessions: number;
  keptLastActiveFullSalesSessions: number;
  success?: boolean;
};

type ManualOrganizationCreateResponse = {
  activationMail?: "sent" | "skipped";
  activationMailReason?: "not_configured" | "send_failed" | null;
  error?: string;
  organizationId?: string;
  organizationName?: string;
  ownerEmail?: string;
  ownerUserCreated?: boolean;
  ownerUserId?: string;
  seatLimit?: number;
  success?: boolean;
  usageDurationDays?: number;
  validUntil?: string;
};

function getPlanLabel(planKey: string | null) {
  switch (planKey) {
    case "solo":
      return "Solo-Lizenz";
    case "team_3":
      return "Team Seat 10";
    case "team_5":
      return "Team Seat 50";
    case "enterprise":
      return "Enterprise";
    case "manual":
      return "Manuell";
    default:
      return "Nicht hinterlegt";
  }
}

function getUserStatusLabel(isActive: boolean) {
  return isActive ? "Aktiv" : "Gesperrt";
}

function getOrganizationStatusLabel(isActive: boolean) {
  return isActive ? "Organisation aktiv" : "Organisation gesperrt";
}

function getSubscriptionStatusLabel(status: string | null) {
  if (!status) {
    return null;
  }

  switch (status) {
    case "active":
      return "Abo aktiv";
    case "past_due":
    case "pending":
      return "Zahlung offen";
    case "payment_failed":
      return "Zahlung fehlgeschlagen";
    case "manual_active":
      return "Manuell aktiv";
    case "manual_expired":
    case "expired":
    case "canceled":
    case "cancelled":
    case "chargeback":
    case "refunded":
      return "Abgelaufen";
    default:
      return status;
  }
}

function getRoleLabel(roleInOrg: string) {
  return roleInOrg === "admin" ? "Owner / Admin" : "Member";
}

function hasSignupOrderData(signupOrder: AdminMember["signupOrder"]) {
  return Boolean(
    signupOrder?.orderId ||
      signupOrder?.amount ||
      signupOrder?.vatAmount ||
      signupOrder?.customerEmail
  );
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

function formatDate(value: string | null) {
  if (!value) {
    return "Nicht hinterlegt";
  }

  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getEntitlementDateLabel(organization: AdminOrganization) {
  if (organization.copecart) {
    return organization.copecart.paidUntil
      ? `Bezahlt bis: ${formatDate(organization.copecart.paidUntil)}`
      : "Laufzeit: nicht hinterlegt";
  }

  if (organization.planKey === "manual") {
    return organization.validUntil
      ? `Gültig bis: ${formatDate(organization.validUntil)}`
      : "Laufzeit: nicht hinterlegt";
  }

  return organization.validUntil
    ? `Gültig bis: ${formatDate(organization.validUntil)}`
    : "Laufzeit: nicht hinterlegt";
}

function getBillingStatusLabel(organization: AdminOrganization) {
  const explicitStatusLabel = getSubscriptionStatusLabel(
    organization.copecart?.subscriptionStatus ?? organization.subscriptionStatus
  );

  if (explicitStatusLabel) {
    return explicitStatusLabel;
  }

  if (organization.planKey !== "manual") {
    return null;
  }

  if (!organization.validUntil) {
    return "Manuell aktiv";
  }

  return new Date(organization.validUntil).getTime() >= Date.now()
    ? "Manuell aktiv"
    : "Abgelaufen";
}

function getUsageDurationLabel(organization: AdminOrganization) {
  if (organization.planKey !== "manual" || !organization.validUntil) {
    return "Nicht hinterlegt";
  }

  const createdAtMs = new Date(organization.createdAt).getTime();
  const validUntilMs = new Date(organization.validUntil).getTime();

  if (Number.isNaN(createdAtMs) || Number.isNaN(validUntilMs) || validUntilMs <= createdAtMs) {
    return "Nicht hinterlegt";
  }

  return `${Math.max(Math.round((validUntilMs - createdAtMs) / 86_400_000), 1)} Tage`;
}

export function AdminPageView() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [industrySelections, setIndustrySelections] = useState<
    Record<string, IndustryKey>
  >({});
  const [franchiseVerticalSelections, setFranchiseVerticalSelections] = useState<
    Record<string, FranchiseVerticalKey>
  >({});
  const [cleanupConfirmValue, setCleanupConfirmValue] = useState("");
  const [cleanupError, setCleanupError] = useState("");
  const [cleanupPreview, setCleanupPreview] = useState<CleanupResponse | null>(null);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isCleanupPreviewLoading, setIsCleanupPreviewLoading] = useState(false);
  const [isCleanupRunning, setIsCleanupRunning] = useState(false);
  const [isManualOrgModalOpen, setIsManualOrgModalOpen] = useState(false);
  const [isManualOrgSubmitting, setIsManualOrgSubmitting] = useState(false);
  const [manualOrgError, setManualOrgError] = useState("");
  const [manualOrganizationName, setManualOrganizationName] = useState("");
  const [manualOwnerEmail, setManualOwnerEmail] = useState("");
  const [manualOwnerFirstName, setManualOwnerFirstName] = useState("");
  const [manualOwnerLastName, setManualOwnerLastName] = useState("");
  const [manualSeatLimit, setManualSeatLimit] = useState("1");
  const [manualUsageDurationDays, setManualUsageDurationDays] = useState("14");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [systemEvents, setSystemEvents] = useState<AdminSystemEvent[]>([]);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [expandedOrganizationIds, setExpandedOrganizationIds] = useState<Set<string>>(
    () => new Set()
  );

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

        const response = await fetch("/api/admin/overview", {
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
            setError(responseBody.error ?? "");
            setIsLoading(false);
          }
          return;
        }

        if (!response.ok || !responseBody.organizations) {
          throw new Error(
            responseBody.error ?? "Die Admin-Daten konnten nicht geladen werden."
          );
        }

        if (isActive) {
          setCurrentUserId(sessionUserId);
          setOrganizations(responseBody.organizations);
          setIndustrySelections(
            responseBody.organizations.reduce<Record<string, IndustryKey>>(
              (accumulator, organization) => {
                accumulator[organization.id] = organization.industryKey;
                return accumulator;
              },
              {}
            )
          );
          setFranchiseVerticalSelections(
            responseBody.organizations.reduce<Record<string, FranchiseVerticalKey>>(
              (accumulator, organization) => {
                accumulator[organization.id] = organization.franchiseVertical ?? "other";
                return accumulator;
              },
              {}
            )
          );
          setSystemEvents(responseBody.systemEvents ?? []);
          setError("");
          setFeedback("");
          setIsForbidden(false);
          setIsLoading(false);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : "Die Admin-Daten konnten nicht geladen werden."
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

  const totals = useMemo(() => {
    return organizations.reduce(
      (accumulator, organization) => {
        accumulator.members += organization.memberCount;
        accumulator.organizations += 1;
        accumulator.seats += organization.seatLimit;
        return accumulator;
      },
      { members: 0, organizations: 0, seats: 0 }
    );
  }, [organizations]);

  const toggleOrganizationExpanded = (organizationId: string) => {
    setExpandedOrganizationIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(organizationId)) {
        nextIds.delete(organizationId);
      } else {
        nextIds.add(organizationId);
      }

      return nextIds;
    });
  };

  const runCleanupRequest = async (dryRun: boolean) => {
    if (!hasSupabaseEnv) {
      throw new Error(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
    }

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
      throw new Error("Nicht autorisiert.");
    }

    const response = await fetch("/api/admin/cleanup-sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dryRun }),
    });

    const responseBody = (await response.json()) as CleanupResponse;

    if (!response.ok || !responseBody.success) {
      throw new Error(
        responseBody.error ??
          "Die Datenbankbereinigung konnte nicht ausgeführt werden."
      );
    }

    return responseBody;
  };

  const handleOpenCleanupModal = async () => {
    setCleanupConfirmValue("");
    setCleanupError("");
    setCleanupPreview(null);
    setError("");
    setFeedback("");
    setIsCleanupModalOpen(true);
    setIsCleanupPreviewLoading(true);

    try {
      const preview = await runCleanupRequest(true);
      setCleanupPreview(preview);
    } catch (err) {
      setCleanupError(
        err instanceof Error
          ? err.message
          : "Die Cleanup-Vorschau konnte nicht geladen werden."
      );
    } finally {
      setIsCleanupPreviewLoading(false);
    }
  };

  const handleRefreshCleanupPreview = async () => {
    setCleanupError("");
    setIsCleanupPreviewLoading(true);

    try {
      const preview = await runCleanupRequest(true);
      setCleanupPreview(preview);
    } catch (err) {
      setCleanupError(
        err instanceof Error
          ? err.message
          : "Die Cleanup-Vorschau konnte nicht geladen werden."
      );
    } finally {
      setIsCleanupPreviewLoading(false);
    }
  };

  const handleCleanupConfirm = async () => {
    if (cleanupConfirmValue.trim() !== "CLEANUP") {
      setCleanupError(
        'Bitte gib zur Bestätigung exakt "CLEANUP" ein.'
      );
      return;
    }

    try {
      setIsCleanupRunning(true);
      setCleanupError("");
      setError("");
      setFeedback("");

      const result = await runCleanupRequest(false);

      setFeedback(
        `Datenbankbereinigung abgeschlossen. Gelöschte Sessions: ${result.deletedSessions}. Behaltene completed Sessions: ${result.keptCompletedSessions}. Behaltene letzte aktive Full-Sales-Sessions: ${result.keptLastActiveFullSalesSessions}.`
      );
      setIsCleanupModalOpen(false);
      setCleanupConfirmValue("");
      setCleanupPreview(result);
    } catch (err) {
      setCleanupError(
        err instanceof Error
          ? err.message
          : "Die Datenbankbereinigung konnte nicht ausgeführt werden."
      );
    } finally {
      setIsCleanupRunning(false);
    }
  };

  const handleCloseCleanupModal = () => {
    if (isCleanupPreviewLoading || isCleanupRunning) {
      return;
    }

    setIsCleanupModalOpen(false);
    setCleanupConfirmValue("");
    setCleanupError("");
  };

  const handleOpenManualOrgModal = () => {
    setManualOrgError("");
    setManualOrganizationName("");
    setManualOwnerEmail("");
    setManualOwnerFirstName("");
    setManualOwnerLastName("");
    setManualSeatLimit("1");
    setManualUsageDurationDays("14");
    setIsManualOrgModalOpen(true);
  };

  const handleCloseManualOrgModal = () => {
    if (isManualOrgSubmitting) {
      return;
    }

    setIsManualOrgModalOpen(false);
    setManualOrgError("");
  };

  const handleManualOrganizationCreate = async () => {
    if (!hasSupabaseEnv) {
      setManualOrgError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    const parsedSeatLimit = Number.parseInt(manualSeatLimit.trim(), 10);
    const parsedUsageDurationDays = Number.parseInt(
      manualUsageDurationDays.trim(),
      10
    );

    if (!manualOrganizationName.trim()) {
      setManualOrgError("Organisationsname ist erforderlich.");
      return;
    }

    if (!manualOwnerFirstName.trim()) {
      setManualOrgError("Vorname Inhaber ist erforderlich.");
      return;
    }

    if (!manualOwnerLastName.trim()) {
      setManualOrgError("Nachname Inhaber ist erforderlich.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualOwnerEmail.trim())) {
      setManualOrgError("E-Mail Inhaber ist ungültig.");
      return;
    }

    if (!Number.isInteger(parsedSeatLimit) || parsedSeatLimit <= 0) {
      setManualOrgError("Seat-Limit muss eine positive ganze Zahl sein.");
      return;
    }

    if (!Number.isInteger(parsedUsageDurationDays) || parsedUsageDurationDays <= 0) {
      setManualOrgError(
        "Nutzungsdauer in Tagen muss eine positive ganze Zahl sein."
      );
      return;
    }

    try {
      setIsManualOrgSubmitting(true);
      setManualOrgError("");
      setError("");
      setFeedback("");

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

      const response = await fetch("/api/admin/organizations/manual-create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationName: manualOrganizationName.trim(),
          ownerEmail: manualOwnerEmail.trim(),
          ownerFirstName: manualOwnerFirstName.trim(),
          ownerLastName: manualOwnerLastName.trim(),
          seatLimit: parsedSeatLimit,
          usage_duration_days: parsedUsageDurationDays,
        }),
      });

      const responseBody = (await response.json()) as ManualOrganizationCreateResponse;

      if (!response.ok || !responseBody.success) {
        throw new Error(
          responseBody.error ??
            "Die Organisation konnte nicht manuell angelegt werden."
        );
      }

      setFeedback(
        responseBody.activationMail === "sent"
          ? `Organisation ${responseBody.organizationName} wurde angelegt. Aktivierungs-Mail wurde an ${responseBody.ownerEmail} gesendet. Gültig bis ${formatDateTime(responseBody.validUntil ?? null)}.`
          : `Organisation ${responseBody.organizationName} wurde angelegt. Die Aktivierungs-Mail konnte nicht automatisch versendet werden. Gültig bis ${formatDateTime(responseBody.validUntil ?? null)}.`
      );
      setIsManualOrgModalOpen(false);
      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      setManualOrgError(
        err instanceof Error
          ? err.message
          : "Die Organisation konnte nicht manuell angelegt werden."
      );
    } finally {
      setIsManualOrgSubmitting(false);
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
      setUpdatingKey(`user:${userId}`);
      setError("");
      setFeedback("");

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

      const response = await fetch(`/api/admin/users/${userId}/status`, {
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
          responseBody.error ?? "Der User-Status konnte nicht aktualisiert werden."
        );
      }

      setOrganizations((currentOrganizations) =>
        currentOrganizations.map((organization) => ({
          ...organization,
          members: organization.members.map((member) =>
            member.id === userId ? { ...member, isActive } : member
          ),
        }))
      );
      setFeedback("User-Status erfolgreich aktualisiert.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der User-Status konnte nicht aktualisiert werden."
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleOrganizationStatusUpdate = async (
    organizationId: string,
    isActive: boolean
  ) => {
    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    try {
      setUpdatingKey(`organization:${organizationId}`);
      setError("");
      setFeedback("");

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
        `/api/admin/organizations/${organizationId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive }),
        }
      );

      const responseBody = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          responseBody.error ??
            "Der Organisationsstatus konnte nicht aktualisiert werden."
        );
      }

      setOrganizations((currentOrganizations) =>
        currentOrganizations.map((organization) =>
          organization.id === organizationId
            ? { ...organization, isActive }
            : organization
        )
      );
      setFeedback("Organisationsstatus erfolgreich aktualisiert.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Organisationsstatus konnte nicht aktualisiert werden."
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleIndustryUpdate = async (
    organizationId: string,
    industryKey: IndustryKey,
    franchiseVertical?: FranchiseVerticalKey
  ) => {
    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    try {
      setUpdatingKey(`industry:${organizationId}`);
      setError("");
      setFeedback("");

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

      const response = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          franchiseVertical:
            industryKey === "franchise"
              ? franchiseVertical ?? franchiseVerticalSelections[organizationId] ?? "other"
              : null,
          industryKey,
          promptProfileKey: industryKey,
        }),
      });

      const responseBody = (await response.json()) as ActionResponse;

      if (!response.ok || !responseBody.success) {
        throw new Error(
          responseBody.error ?? "Die Branche konnte nicht aktualisiert werden."
        );
      }

      setOrganizations((currentOrganizations) =>
        currentOrganizations.map((organization) =>
          organization.id === organizationId
            ? {
                ...organization,
                industryKey: responseBody.industryKey ?? industryKey,
                franchiseVertical:
                  responseBody.industryKey === "franchise"
                    ? responseBody.franchiseVertical ??
                      organization.franchiseVertical ??
                      "other"
                    : null,
                promptProfileKey:
                  responseBody.promptProfileKey ?? organization.promptProfileKey,
              }
            : organization
        )
      );
      setIndustrySelections((currentSelections) => ({
        ...currentSelections,
        [organizationId]: responseBody.industryKey ?? industryKey,
      }));
      if ((responseBody.industryKey ?? industryKey) === "franchise") {
        setFranchiseVerticalSelections((currentSelections) => ({
          ...currentSelections,
          [organizationId]:
            responseBody.franchiseVertical ??
            franchiseVertical ??
            currentSelections[organizationId] ??
            "other",
        }));
      }
      setFeedback("Branche erfolgreich aktualisiert.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Branche konnte nicht aktualisiert werden."
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleOrganizationDelete = async (organizationId: string) => {
    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    if (!window.confirm("Organisation wirklich löschen?")) {
      return;
    }

    try {
      setUpdatingKey(`organization-delete:${organizationId}`);
      setError("");
      setFeedback("");

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

      const response = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const responseBody = (await response.json()) as ActionResponse;

      if (!response.ok) {
        throw new Error(
          responseBody.error ?? "Die Organisation konnte nicht gelöscht werden."
        );
      }

      setOrganizations((currentOrganizations) =>
        currentOrganizations.filter(
          (organization) => organization.id !== organizationId
        )
      );
      setFeedback("Organisation erfolgreich gelöscht.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Organisation konnte nicht gelöscht werden."
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!hasSupabaseEnv) {
      setError(
        "Supabase ist noch nicht vollständig konfiguriert. Prüfe deine Umgebungsvariablen."
      );
      return;
    }

    if (!window.confirm("User wirklich löschen?")) {
      return;
    }

    try {
      setUpdatingKey(`user-delete:${userId}`);
      setError("");
      setFeedback("");

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

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const responseBody = (await response.json()) as ActionResponse;

      if (!response.ok) {
        throw new Error(
          responseBody.error ?? "Der User konnte nicht gelöscht werden."
        );
      }

      setOrganizations((currentOrganizations) =>
        currentOrganizations.map((organization) => {
          const members = organization.members.filter((member) => member.id !== userId);
          const nextOwner =
            members.find((member) => member.roleInOrg === "admin") ?? members[0] ?? null;

          return {
            ...organization,
            memberCount: members.length,
            members,
            owner: organization.owner.id === userId
              ? {
                  email: nextOwner?.email ?? null,
                  id: nextOwner?.id ?? null,
                  name: nextOwner?.name ?? null,
                  signupOrder: nextOwner?.signupOrder ?? null,
                }
              : organization.owner,
          };
        })
      );
      setFeedback("User erfolgreich gelöscht.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Der User konnte nicht gelöscht werden."
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <InternalAppShell>
      <div className={plusJakartaSans.className}>
          <section className="flex flex-1 items-start py-10 sm:py-14">
            <div className="w-full rounded-[2rem] border border-white/80 bg-white/82 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6 lg:p-8">
              <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-8 lg:p-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0e51a0]">
                      Plattform-Admin
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[#707070] sm:text-5xl">
                      Verwaltung für Organisationen, Seats und Mitglieder.
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                      Behalte alle talkingHEADS Sales Trainer-Organisationen im Blick, prüfe Belegungen und verwalte Aktivstatus zentral an einem Ort.
                    </p>
                  </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      [`${totals.organizations}`, "Organisationen"],
                      [`${totals.seats}`, "Seats gesamt"],
                      [`${totals.members}`, "Mitglieder"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/80 bg-white/85 px-5 py-4 text-[#707070] shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                      >
                        <p className="text-2xl font-semibold tracking-[-0.04em]">
                          {value}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {!isLoading && !isForbidden ? (
                  <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                      System-Events
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Letzte 10 Monitoring-Einträge aus dem Systembetrieb.
                    </p>

                    <div className="mt-4 space-y-3">
                      {systemEvents.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Keine System-Events vorhanden.
                        </p>
                      ) : (
                        systemEvents.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                                  {event.severity}
                                </span>
                                <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
                                  {event.source}
                                </span>
                                {event.alertSentAt ? (
                                  <span className="text-xs text-rose-600">
                                    Alert gesendet
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-xs text-slate-500">
                                {new Date(event.createdAt).toLocaleString("de-DE")}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{event.message}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Env: {event.environment ?? "unknown"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                {isLoading ? (
                  <p className="mt-8 text-base leading-7 text-slate-600">
                    Verwaltung wird geladen...
                  </p>
                ) : null}

                {!isLoading && isForbidden ? (
                  <div className="mt-8 rounded-[1.75rem] border border-amber-200 bg-amber-50/95 p-6">
                    <h2 className="text-xl font-semibold text-[#707070]">
                      Kein Zugriff auf die Plattform-Verwaltung
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[#707070]">
                      {error || "Dieser Account ist nicht als globaler Admin freigeschaltet."}
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0e51a0] px-5 text-sm font-semibold text-white"
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

                {!isLoading && !isForbidden && feedback ? (
                  <p className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {feedback}
                  </p>
                ) : null}

                {!isLoading && !isForbidden ? (
                  <div className="mt-8 space-y-5">
                    <section className="rounded-[1.75rem] border border-[#d8e6f8] bg-[linear-gradient(180deg,rgba(245,250,255,0.98)_0%,rgba(239,247,255,0.95)_100%)] p-5 shadow-[0_18px_46px_rgba(14,81,160,0.08)]">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                            Master-Admin
                          </p>
                          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#707070]">
                            Organisation manuell anlegen
                          </h2>
                          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                            Lege eine Organisation mit frei definierbarem Seat-Limit an, ohne CopeCart-Kauf und mit direkter Aktivierungs-Mail an den Inhaber.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenManualOrgModal}
                          disabled={isManualOrgSubmitting || updatingKey !== null}
                          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0e51a0] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(14,81,160,0.22)] transition hover:bg-[#0b478b] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Organisation manuell anlegen
                        </button>
                      </div>
                    </section>

                    <section className="rounded-[1.75rem] border border-[#f3d6cf] bg-[linear-gradient(180deg,rgba(255,248,246,0.98)_0%,rgba(255,243,240,0.95)_100%)] p-5 shadow-[0_18px_46px_rgba(194,83,58,0.08)]">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#707070]">
                            Master-Admin
                          </p>
                          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#707070]">
                            Datenbank aufräumen
                          </h2>
                          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                            Löscht alle Sessions außer completed Sessions und
                            der letzten aktiven Full-Sales-Session pro User.
                            Zugehörige Nachrichten und Snapshots werden über
                            Datenbank-Cascades automatisch mitbereinigt.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleOpenCleanupModal()}
                          disabled={
                            isCleanupPreviewLoading ||
                            isCleanupRunning ||
                            updatingKey !== null
                          }
                          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e8b8ad] bg-white px-5 py-3 text-sm font-semibold text-[#707070] shadow-[0_14px_34px_rgba(194,83,58,0.1)] transition hover:bg-[#fff7f4] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isCleanupPreviewLoading
                            ? "Prüfe Cleanup..."
                            : "Datenbank aufräumen"}
                        </button>
                      </div>
                    </section>

                    {organizations.map((organization) => {
                      const isExpanded = expandedOrganizationIds.has(organization.id);
                      const billingStatusLabel = getBillingStatusLabel(organization);

                      return (
                      <section
                        key={organization.id}
                        className="rounded-[1.75rem] border border-white/80 bg-white/88 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.08)] transition sm:p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <button
                            type="button"
                            onClick={() => toggleOrganizationExpanded(organization.id)}
                            aria-expanded={isExpanded}
                            aria-controls={`organization-details-${organization.id}`}
                            className="group flex min-w-0 flex-1 flex-col items-start rounded-[1.35rem] px-2 py-2 text-left transition hover:bg-slate-50/80 focus:outline-none focus:ring-4 focus:ring-[#0e51a0]/10 sm:px-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#0e51a0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0e51a0]">
                                {organization.packageLabel || getPlanLabel(organization.planKey)}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                  organization.isActive
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-[#707070]"
                                }`}
                              >
                                {getOrganizationStatusLabel(organization.isActive)}
                              </span>
                              {billingStatusLabel ? (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                                  {billingStatusLabel}
                                </span>
                              ) : null}
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-100">
                                {getEntitlementDateLabel(organization)}
                              </span>
                            </div>
                            <div className="mt-3 flex w-full flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                              <div className="min-w-0">
                                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#707070] sm:text-2xl">
                                  {organization.organizationName}
                                </h2>
                                <div className="mt-1 text-sm leading-6 text-slate-600">
                                  <p>
                                    Owner:{" "}
                                    {organization.owner.name ??
                                      organization.owner.email ??
                                      "Nicht hinterlegt"}
                                  </p>
                                  <p className="text-slate-500">
                                    {organization.owner.email ?? "Keine E-Mail gefunden"}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {isExpanded ? "Details ausblenden" : "Details anzeigen"}
                              </span>
                            </div>
                          </button>

                          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                void handleOrganizationStatusUpdate(
                                  organization.id,
                                  !organization.isActive
                                )
                              }
                              disabled={
                                updatingKey === `organization:${organization.id}` ||
                                updatingKey === `industry:${organization.id}` ||
                                updatingKey === `organization-delete:${organization.id}`
                              }
                              className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                                organization.isActive
                                  ? "border border-amber-200 bg-amber-50 text-[#707070] hover:bg-amber-100"
                                  : "bg-[#0e51a0] text-white hover:bg-[#0b478b]"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {updatingKey === `organization:${organization.id}`
                                ? "Aktualisiere..."
                                : organization.isActive
                                  ? "Organisation sperren"
                                  : "Organisation entsperren"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleOrganizationDelete(organization.id)
                              }
                              disabled={
                                updatingKey === `organization:${organization.id}` ||
                                updatingKey === `industry:${organization.id}` ||
                                updatingKey === `organization-delete:${organization.id}`
                              }
                              className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {updatingKey === `organization-delete:${organization.id}`
                                ? "Lösche..."
                                : "Löschen"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleOrganizationExpanded(organization.id)}
                              aria-expanded={isExpanded}
                              aria-controls={`organization-details-${organization.id}`}
                              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] focus:outline-none focus:ring-4 focus:ring-[#0e51a0]/10"
                              aria-label={
                                isExpanded
                                  ? `${organization.organizationName} einklappen`
                                  : `${organization.organizationName} ausklappen`
                              }
                            >
                              <svg
                                aria-hidden="true"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                {isExpanded ? (
                                  <path d="m18 15-6-6-6 6" />
                                ) : (
                                  <path d="m6 9 6 6 6-6" />
                                )}
                              </svg>
                            </button>
                          </div>
                        </div>

                        {isExpanded ? (
                          <div
                            id={`organization-details-${organization.id}`}
                            className="mt-5 border-t border-slate-100 pt-5"
                          >
                            <div className="max-w-3xl">
                              <div className="rounded-2xl border border-slate-100 bg-white/90 px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Owner
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#707070]">
                                {organization.owner.name ??
                                  organization.owner.email ??
                                  "Nicht hinterlegt"}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {organization.owner.email ?? "Keine E-Mail gefunden"}
                              </p>
                            </div>
                              {hasSignupOrderData(organization.owner.signupOrder) ? (
                                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Kaufdaten zur Prüfung
                                </p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  <p className="text-sm text-slate-600">
                                    Order ID:{" "}
                                    {organization.owner.signupOrder?.orderId ?? "Nicht hinterlegt"}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    Betrag:{" "}
                                    {organization.owner.signupOrder?.amount ?? "Nicht hinterlegt"}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    USt.:{" "}
                                    {organization.owner.signupOrder?.vatAmount ?? "Nicht hinterlegt"}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    Kauf-E-Mail:{" "}
                                    {organization.owner.signupOrder?.customerEmail ??
                                      organization.owner.email ??
                                      "Nicht hinterlegt"}
                                  </p>
                                </div>
                              </div>
                              ) : null}
                              {organization.seatLimitSource !== "stored" ? (
                                <p className="mt-4 text-sm leading-7 text-[#707070]">
                                Seat-Limit wird aktuell aus den verfügbaren Paketdaten abgeleitet.
                              </p>
                              ) : null}
                              {organization.planKey === "manual" ? (
                                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Manuell
                                </p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  <p className="text-sm text-slate-600">
                                    Nutzungsdauer: {getUsageDurationLabel(organization)}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    Gültig bis: {formatDateTime(organization.validUntil)}
                                  </p>
                                </div>
                              </div>
                              ) : null}
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
                              <div className="mt-4 flex flex-col gap-2 sm:max-w-xs">
                              <label
                                htmlFor={`industry-${organization.id}`}
                                className="text-sm font-medium text-[#707070]"
                              >
                                Branche
                              </label>
                              {(() => {
                                const selectedIndustry =
                                  industrySelections[organization.id] ??
                                  organization.industryKey;
                                const selectedFranchiseVertical =
                                  franchiseVerticalSelections[organization.id] ??
                                  organization.franchiseVertical ??
                                  "other";
                                const isIndustryUpdating =
                                  updatingKey === `industry:${organization.id}`;
                                const hasIndustryChanged =
                                  selectedIndustry !== organization.industryKey ||
                                  (selectedIndustry === "franchise" &&
                                    selectedFranchiseVertical !==
                                      (organization.franchiseVertical ?? "other"));

                                return (
                                  <>
                                    <select
                                      id={`industry-${organization.id}`}
                                      value={selectedIndustry}
                                      onChange={(event) =>
                                        setIndustrySelections((currentSelections) => ({
                                          ...currentSelections,
                                          [organization.id]: event.target.value as IndustryKey,
                                        }))
                                      }
                                      disabled={isIndustryUpdating}
                                      className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {INDUSTRY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleIndustryUpdate(
                                          organization.id,
                                          selectedIndustry,
                                          selectedFranchiseVertical
                                        )
                                      }
                                      disabled={!hasIndustryChanged || isIndustryUpdating}
                                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0e51a0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c4388] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isIndustryUpdating ? "Speichere..." : "Ändern"}
                                    </button>
                                    <p className="text-xs text-slate-500">
                                      Aktuelle Branche: {organization.industryKey}
                                    </p>
                                    {selectedIndustry === "franchise" ? (
                                      <>
                                        <label
                                          htmlFor={`franchise-vertical-${organization.id}`}
                                          className="mt-2 text-sm font-medium text-[#707070]"
                                        >
                                          Franchise-Segment
                                        </label>
                                        <select
                                          id={`franchise-vertical-${organization.id}`}
                                          value={selectedFranchiseVertical}
                                          onChange={(event) =>
                                            setFranchiseVerticalSelections((currentSelections) => ({
                                              ...currentSelections,
                                              [organization.id]:
                                                event.target.value as FranchiseVerticalKey,
                                            }))
                                          }
                                          disabled={isIndustryUpdating}
                                          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {FRANCHISE_VERTICAL_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                        <p className="text-xs text-slate-500">
                                          Aktuelles Segment: {organization.franchiseVertical ?? "other"}
                                        </p>
                                      </>
                                    ) : null}
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                          {[
                            [organization.packageLabel, "Paket"],
                            [`${organization.seatLimit}`, "Seat-Limit"],
                            [`${organization.memberCount}`, "Aktive Nutzer"],
                            [`${organization.pendingInvitationCount}`, "Offene Einladungen"],
                            [`${organization.availableSeats}`, "Verfügbare Seats"],
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

                        <div className="mt-6">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold text-[#707070]">
                              Teammitglieder
                            </h3>
                            <p className="text-sm text-slate-500">
                              {organization.members.length} Einträge
                            </p>
                          </div>

                          <div className="mt-4 space-y-3">
                            {organization.members.map((member) => (
                              <article
                                key={`${organization.id}-${member.id}`}
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
                                            : "bg-amber-50 text-[#707070]"
                                        }`}
                                      >
                                        {getUserStatusLabel(member.isActive)}
                                      </span>
                                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        {getRoleLabel(member.roleInOrg)}
                                      </span>
                                      {member.platformRole ? (
                                        <span className="rounded-full bg-[#0e51a0]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0e51a0]">
                                          {member.platformRole}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                      {member.email ?? "Keine E-Mail gefunden"}
                                    </p>
                                    {hasSignupOrderData(member.signupOrder) ? (
                                      <div className="mt-3 rounded-2xl border border-slate-100 bg-white/90 px-3 py-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                          Kaufdaten
                                        </p>
                                        <div className="mt-2 space-y-1">
                                          <p className="text-sm text-slate-600">
                                            Order ID: {member.signupOrder?.orderId ?? "Nicht hinterlegt"}
                                          </p>
                                          <p className="text-sm text-slate-600">
                                            Betrag: {member.signupOrder?.amount ?? "Nicht hinterlegt"}
                                          </p>
                                          <p className="text-sm text-slate-600">
                                            USt.: {member.signupOrder?.vatAmount ?? "Nicht hinterlegt"}
                                          </p>
                                          <p className="text-sm text-slate-600">
                                            Kauf-E-Mail:{" "}
                                            {member.signupOrder?.customerEmail ??
                                              member.email ??
                                              "Nicht hinterlegt"}
                                          </p>
                                        </div>
                                      </div>
                                    ) : null}
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
                                      disabled={
                                        updatingKey === `user:${member.id}` ||
                                        updatingKey === `user-delete:${member.id}` ||
                                        member.id === currentUserId
                                      }
                                      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                                        member.isActive
                                          ? "border border-amber-200 bg-amber-50 text-[#707070] hover:bg-amber-100"
                                          : "bg-[#0e51a0] text-white hover:bg-[#0b478b]"
                                      } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                      {updatingKey === `user:${member.id}`
                                        ? "Aktualisiere..."
                                        : member.isActive
                                          ? "User sperren"
                                          : "User entsperren"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleUserDelete(member.id)
                                      }
                                      disabled={
                                        updatingKey === `user:${member.id}` ||
                                        updatingKey === `user-delete:${member.id}` ||
                                        member.id === currentUserId
                                      }
                                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {updatingKey === `user-delete:${member.id}`
                                        ? "Lösche..."
                                        : "Löschen"}
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                          </div>
                          </div>
                        ) : null}
                      </section>
                      );
                    })}
                  </div>
                ) : null}

                {isCleanupModalOpen ? (
                  <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/28 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:px-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cleanup-sessions-title"
                  >
                    <div className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white/92 shadow-[0_28px_90px_rgba(15,23,42,0.2)] backdrop-blur">
                      <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#707070]">
                              Sicherheitsabfrage
                            </p>
                            <h2
                              id="cleanup-sessions-title"
                              className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-3xl"
                            >
                              Datenbank aufräumen
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                              Es werden alle Sessions gelöscht, außer completed
                              Sessions und die letzte aktive Full-Sales-Session
                              pro User. Dieser Vorgang kann nicht rückgängig
                              gemacht werden.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleCloseCleanupModal}
                            disabled={isCleanupPreviewLoading || isCleanupRunning}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#c2533a]/25 hover:text-[#707070] disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Cleanup-Dialog schließen"
                          >
                            ×
                          </button>
                        </div>

                        <div className="mt-6 rounded-[1.5rem] border border-[#f3d6cf] bg-[#fff8f6] p-4">
                          <p className="text-sm font-medium text-[#707070]">
                            Vorschau auf Basis des aktuellen Datenbestands
                          </p>

                          {isCleanupPreviewLoading ? (
                            <p className="mt-3 text-sm leading-7 text-slate-600">
                              Dry-Run wird berechnet...
                            </p>
                          ) : cleanupPreview ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              {[
                                [
                                  `${cleanupPreview.deletedSessions}`,
                                  "Sessions werden gelöscht",
                                ],
                                [
                                  `${cleanupPreview.keptCompletedSessions}`,
                                  "Completed Sessions bleiben",
                                ],
                                [
                                  `${cleanupPreview.keptLastActiveFullSalesSessions}`,
                                  "Letzte aktive Full-Sales-Sessions bleiben",
                                ],
                              ].map(([value, label]) => (
                                <div
                                  key={label}
                                  className="rounded-2xl border border-white/80 bg-white/88 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                                >
                                  <p className="text-xl font-semibold text-[#707070]">
                                    {value}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {label}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm leading-7 text-slate-600">
                              Noch keine Vorschau verfügbar.
                            </p>
                          )}
                        </div>

                        <div className="mt-6">
                          <label
                            htmlFor="cleanup-confirm-input"
                            className="block text-sm font-medium text-[#707070]"
                          >
                            Tippe zur Bestätigung <span className="font-semibold">CLEANUP</span>
                          </label>
                          <input
                            id="cleanup-confirm-input"
                            type="text"
                            value={cleanupConfirmValue}
                            onChange={(event) =>
                              setCleanupConfirmValue(event.target.value)
                            }
                            placeholder="CLEANUP"
                            disabled={isCleanupRunning}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#c2533a] focus:ring-4 focus:ring-[#c2533a]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        {cleanupError ? (
                          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {cleanupError}
                          </p>
                        ) : null}

                        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
                          <button
                            type="button"
                            onClick={() => void handleRefreshCleanupPreview()}
                            disabled={isCleanupPreviewLoading || isCleanupRunning}
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isCleanupPreviewLoading
                              ? "Lade Vorschau..."
                              : "Dry-Run aktualisieren"}
                          </button>

                          <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              onClick={handleCloseCleanupModal}
                              disabled={isCleanupPreviewLoading || isCleanupRunning}
                              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Abbrechen
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCleanupConfirm()}
                              disabled={
                                isCleanupPreviewLoading ||
                                isCleanupRunning ||
                                cleanupConfirmValue.trim() !== "CLEANUP"
                              }
                              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c2533a] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(194,83,58,0.22)] transition hover:bg-[#ad452f] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isCleanupRunning
                                ? "Bereinige Datenbank..."
                                : "Cleanup jetzt ausführen"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {isManualOrgModalOpen ? (
                  <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/28 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:px-6"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="manual-organization-title"
                  >
                    <div className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white/92 shadow-[0_28px_90px_rgba(15,23,42,0.2)] backdrop-blur">
                      <div className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f6f9fd_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0e51a0]">
                              Master-Admin
                            </p>
                            <h2
                              id="manual-organization-title"
                              className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#707070] sm:text-3xl"
                            >
                              Organisation manuell anlegen
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                              Erstelle eine aktive Organisation mit individuellem Seat-Limit und versende direkt den Aktivierungslink an den Inhaber.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleCloseManualOrgModal}
                            disabled={isManualOrgSubmitting}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-lg text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#0e51a0]/25 hover:text-[#0e51a0] disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Dialog schließen"
                          >
                            ×
                          </button>
                        </div>

                          <div className="mt-6 grid gap-5 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-[#707070]">
                              Organisationsname
                            </label>
                            <input
                              type="text"
                              value={manualOrganizationName}
                              onChange={(event) =>
                                setManualOrganizationName(event.target.value)
                              }
                              placeholder="Beispiel GmbH"
                              disabled={isManualOrgSubmitting}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-[#707070]">
                              Vorname Inhaber
                            </label>
                            <input
                              type="text"
                              value={manualOwnerFirstName}
                              onChange={(event) =>
                                setManualOwnerFirstName(event.target.value)
                              }
                              placeholder="Max"
                              disabled={isManualOrgSubmitting}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-[#707070]">
                              Nachname Inhaber
                            </label>
                            <input
                              type="text"
                              value={manualOwnerLastName}
                              onChange={(event) =>
                                setManualOwnerLastName(event.target.value)
                              }
                              placeholder="Mustermann"
                              disabled={isManualOrgSubmitting}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-[#707070]">
                              E-Mail Inhaber
                            </label>
                            <input
                              type="email"
                              value={manualOwnerEmail}
                              onChange={(event) =>
                                setManualOwnerEmail(event.target.value)
                              }
                              placeholder="name@unternehmen.de"
                              disabled={isManualOrgSubmitting}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-[#707070]">
                              Seat-Limit
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={manualSeatLimit}
                              onChange={(event) =>
                                setManualSeatLimit(event.target.value)
                              }
                              disabled={isManualOrgSubmitting}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-[#707070]">
                              Nutzungsdauer in Tagen
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={manualUsageDurationDays}
                              onChange={(event) =>
                                setManualUsageDurationDays(event.target.value)
                              }
                              placeholder="z. B. 14"
                              disabled={isManualOrgSubmitting}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[#707070] shadow-[0_10px_24px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#0e51a0] focus:ring-4 focus:ring-[#0e51a0]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        {manualOrgError ? (
                          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {manualOrgError}
                          </p>
                        ) : null}

                        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={handleCloseManualOrgModal}
                            disabled={isManualOrgSubmitting}
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#707070] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Abbrechen
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleManualOrganizationCreate()}
                            disabled={isManualOrgSubmitting}
                            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0e51a0] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(14,81,160,0.22)] transition hover:bg-[#0b478b] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isManualOrgSubmitting
                              ? "Lege Organisation an..."
                              : "Organisation anlegen"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
      </div>
    </InternalAppShell>
  );
}
