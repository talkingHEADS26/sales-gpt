import {
  getServiceRoleClientInitError,
  getSupabaseServerClient,
  getSupabaseServerClientInitError,
  getSupabaseServiceRoleClient,
  type SupabaseServerClient,
} from "@/lib/supabase-server";
import { resolveOrganizationSeatLimit } from "@/lib/copecart-products";
import { resolveAppAccessStateForUser } from "@/lib/copecart-subscriptions";
import { logSystemEvent } from "@/lib/system-monitoring";

type MembershipRecord = {
  created_at?: string;
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

type MembershipQueryRecord = {
  created_at?: string;
  organization_id: string;
  role_in_org: string;
  organizations: MembershipRecord["organizations"] | MembershipRecord["organizations"][];
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

type LatestSubscriptionRecord = {
  created_at?: string;
  organization_id?: string;
  plan_key: string | null;
};

function isTeamPlanKey(planKey: string | null | undefined) {
  return planKey === "team_3" || planKey === "team_5" || planKey === "enterprise";
}

function normalizeMembershipRecord(entry: MembershipQueryRecord): MembershipRecord {
  const organization = Array.isArray(entry.organizations)
    ? (entry.organizations[0] ?? null)
    : entry.organizations;

  return {
    created_at: entry.created_at,
    organization_id: entry.organization_id,
    organizations: organization,
    role_in_org: entry.role_in_org,
  };
}

async function resolveEffectiveSeatLimit(params: {
  organizationId: string;
  serviceRoleClient: SupabaseServerClient;
  storedSeatLimit: number;
}) {
  const { data: latestSubscription } = await params.serviceRoleClient
    .from("subscriptions")
    .select("plan_key")
    .eq("organization_id", params.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestSubscriptionRecord>();

  return resolveOrganizationSeatLimit({
    planKey: latestSubscription?.plan_key ?? null,
    seatLimit: params.storedSeatLimit,
  }).seatLimit;
}

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
      "organization_id, role_in_org, created_at, organizations!inner(id, organization_name, seat_limit, is_active, industry_key, prompt_profile_key, industry_locked, franchise_vertical)"
    )
    .eq("user_id", user.id)
    .eq("role_in_org", "admin")
    .order("created_at", { ascending: false })
    .limit(25);

  const membershipResult = await membershipQuery;
  const membershipFallbackResult = membershipResult.error?.message?.includes(
    "franchise_vertical"
  )
    ? await supabase
        .from("organization_members")
        .select(
          "organization_id, role_in_org, created_at, organizations!inner(id, organization_name, seat_limit, is_active, industry_key, prompt_profile_key, industry_locked)"
        )
        .eq("user_id", user.id)
        .eq("role_in_org", "admin")
        .order("created_at", { ascending: false })
        .limit(25)
    : null;
  const { data: memberships, error: membershipError } =
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

  const adminMemberships = (memberships ?? [])
    .map((entry) => normalizeMembershipRecord(entry as MembershipQueryRecord))
    .filter((entry) => Boolean(entry.organizations));

  let membership: MembershipRecord | null = adminMemberships[0] ?? null;

  if (adminMemberships.length > 1) {
    const organizationIds = adminMemberships.map((entry) => entry.organization_id);
    const { data: subscriptionRows } = await serviceRoleClient
      .from("subscriptions")
      .select("organization_id, plan_key, created_at")
      .in("organization_id", organizationIds)
      .order("created_at", { ascending: false });
    const latestPlanByOrganization = new Map<string, string | null>();
    for (const row of (subscriptionRows ?? []) as LatestSubscriptionRecord[]) {
      const organizationId = row.organization_id;
      if (!organizationId || latestPlanByOrganization.has(organizationId)) {
        continue;
      }
      latestPlanByOrganization.set(organizationId, row.plan_key ?? null);
    }

    const ranked = adminMemberships
      .map((entry) => ({
        createdAt: entry.created_at ? new Date(entry.created_at).getTime() : 0,
        entry,
        isTeamPlan: isTeamPlanKey(
          latestPlanByOrganization.get(entry.organization_id) ?? null
        ),
        seatLimit: entry.organizations?.seat_limit ?? 1,
      }))
      .sort((a, b) => {
        if (a.isTeamPlan !== b.isTeamPlan) {
          return a.isTeamPlan ? -1 : 1;
        }
        if ((a.seatLimit > 1) !== (b.seatLimit > 1)) {
          return a.seatLimit > 1 ? -1 : 1;
        }
        return b.createdAt - a.createdAt;
      });

    membership = ranked[0]?.entry ?? membership;
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

  const effectiveSeatLimit = await resolveEffectiveSeatLimit({
    organizationId: membership.organization_id,
    serviceRoleClient,
    storedSeatLimit: membership.organizations.seat_limit,
  });

  if (!isMasterAdmin && effectiveSeatLimit <= 1) {
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
    if (!accessState.allowed && effectiveSeatLimit > 1) {
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
