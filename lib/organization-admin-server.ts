import {
  getServiceRoleClientInitError,
  getSupabaseServerClient,
  getSupabaseServerClientInitError,
  getSupabaseServiceRoleClient,
  type SupabaseServerClient,
} from "@/lib/supabase-server";
import { resolveAppAccessStateForUser } from "@/lib/copecart-subscriptions";
import { logSystemEvent } from "@/lib/system-monitoring";

type MembershipRecord = {
  organization_id: string;
  role_in_org: string;
  organizations: {
    franchise_vertical?: string | null;
    id: string;
    industry_key: string | null;
    industry_locked: boolean | null;
    is_active: boolean;
    organization_name: string;
    prompt_profile_key: string | null;
    seat_limit: number;
  } | null;
};

type OrganizationFallbackRecord = {
  franchise_vertical?: string | null;
  id: string;
  industry_key: string | null;
  industry_locked: boolean | null;
  is_active: boolean;
  organization_name: string;
  prompt_profile_key: string | null;
  seat_limit: number;
};

type ProfileRecord = {
  is_active: boolean;
  role: string | null;
};

type OrganizationAdminAuthSuccess = {
  membership: MembershipRecord;
  serviceRoleClient: SupabaseServerClient;
  supabase: SupabaseServerClient;
  userId: string;
};

type OrganizationAdminAuthFailure = {
  error: string;
  status: number;
};

export type OrganizationAdminAuthResult =
  | OrganizationAdminAuthFailure
  | OrganizationAdminAuthSuccess;

export async function requireOrganizationAdmin(
  authorizationHeader: string | null
): Promise<OrganizationAdminAuthResult> {
  const accessToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : undefined;

  if (!accessToken) {
    return {
      error: "Nicht autorisiert.",
      status: 401,
    };
  }

  const supabase = getSupabaseServerClient(accessToken);
  const serviceRoleClient = getSupabaseServiceRoleClient();

  if (!supabase || !serviceRoleClient) {
    const errorMessage =
      getSupabaseServerClientInitError() ??
      getServiceRoleClientInitError() ??
      "Supabase Server Client konnte nicht initialisiert werden.";

    await logSystemEvent({
      forceNotify: true,
      message: "Organization admin auth could not initialize Supabase clients",
      metadata: {
        error: errorMessage,
      },
      severity: "critical",
      source: "auth",
    });

    return {
      error: errorMessage,
      status: 500,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "Nicht autorisiert.",
      status: 401,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  if (profileError) {
    await logSystemEvent({
      message: "Organization admin profile lookup failed",
      metadata: {
        error: profileError.message,
        userId: user.id,
      },
      severity: "error",
      source: "auth",
    });

    return {
      error: profileError.message,
      status: 500,
    };
  }

  if (!profile?.is_active) {
    return {
      error: "Dieser Account ist derzeit deaktiviert.",
      status: 403,
    };
  }

  const isMasterAdmin = profile.role === "master_admin";

  const membershipQuery = supabase
    .from("organization_members")
    .select(
      "organization_id, role_in_org, organizations!inner(id, organization_name, seat_limit, is_active, industry_key, prompt_profile_key, industry_locked, franchise_vertical)"
    )
    .eq("user_id", user.id);

  const membershipResult = await membershipQuery.limit(1).maybeSingle<MembershipRecord>();
  const membershipFallbackResult = membershipResult.error?.message?.includes(
    "franchise_vertical"
  )
    ? await supabase
        .from("organization_members")
        .select(
          "organization_id, role_in_org, organizations!inner(id, organization_name, seat_limit, is_active, industry_key, prompt_profile_key, industry_locked)"
        )
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle<MembershipRecord>()
    : null;
  const { data: membership, error: membershipError } =
    membershipFallbackResult ?? membershipResult;

  if (membershipError) {
    await logSystemEvent({
      message: "Organization admin membership lookup failed",
      metadata: {
        error: membershipError.message,
        userId: user.id,
      },
      severity: "error",
      source: "auth",
    });

    return {
      error: membershipError.message,
      status: 500,
    };
  }

  if (isMasterAdmin && !membership?.organizations) {
    const fallbackOrganizationWithFranchise = await serviceRoleClient
      .from("organizations")
      .select(
        "id, organization_name, seat_limit, is_active, industry_key, prompt_profile_key, industry_locked, franchise_vertical"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<OrganizationFallbackRecord>();
    const fallbackOrganizationWithoutFranchise =
      fallbackOrganizationWithFranchise.error?.message?.includes(
        "franchise_vertical"
      )
        ? await serviceRoleClient
            .from("organizations")
            .select(
              "id, organization_name, seat_limit, is_active, industry_key, prompt_profile_key, industry_locked"
            )
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle<OrganizationFallbackRecord>()
        : null;
    const { data: fallbackOrganization, error: fallbackOrganizationError } =
      fallbackOrganizationWithoutFranchise ?? fallbackOrganizationWithFranchise;

    if (fallbackOrganizationError) {
      return {
        error: fallbackOrganizationError.message,
        status: 500,
      };
    }

    if (fallbackOrganization) {
      return {
        membership: {
          organization_id: fallbackOrganization.id,
          role_in_org: "admin",
          organizations: fallbackOrganization,
        },
        serviceRoleClient,
        supabase,
        userId: user.id,
      };
    }
  }

  if (!membership?.organizations) {
    if (!isMasterAdmin) {
      const accessState = await resolveAppAccessStateForUser({
        serviceRoleClient,
        userId: user.id,
      });

      if (!accessState.allowed) {
        return {
          error: accessState.message,
          status: 403,
        };
      }
    }

    return {
      error: "Kein Zugriff auf diese Organisations-Verwaltung.",
      status: 403,
    };
  }

  if (!membership.organizations.is_active) {
    return {
      error: "Diese Organisation ist derzeit deaktiviert.",
      status: 403,
    };
  }

  if (!isMasterAdmin && membership.organizations.seat_limit <= 1) {
    return {
      error: "Kein Zugriff auf diese Organisations-Verwaltung.",
      status: 403,
    };
  }

  if (!isMasterAdmin) {
    const accessState = await resolveAppAccessStateForUser({
      serviceRoleClient,
      userId: user.id,
    });

    // Team-Mitglieder mit aktiver Team-Organisation dürfen die Organisationsverwaltung
    // nutzen, auch wenn der zentrale App-Access-State aktuell keine aktive Subscription
    // zurückliefert (z. B. Übergangs-/Dateninkonsistenzen).
    if (!accessState.allowed && membership.organizations.seat_limit > 1) {
      return {
        membership,
        serviceRoleClient,
        supabase,
        userId: user.id,
      };
    }

    if (!accessState.allowed) {
      return {
        error: accessState.message,
        status: 403,
      };
    }
  }

  return {
    membership,
    serviceRoleClient,
    supabase,
    userId: user.id,
  };
}

export function isOrganizationAdminAuthFailure(
  result: OrganizationAdminAuthResult
): result is OrganizationAdminAuthFailure {
  return "status" in result;
}
