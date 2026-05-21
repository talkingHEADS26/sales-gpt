import { NextResponse } from "next/server";

import {
  getPackageLabel,
  resolveOrganizationSeatLimit,
} from "@/lib/copecart-products";
import {
  buildDashboardKpiSummary,
  type DashboardKpiSummary,
  getDashboardKpiSummaryForUser,
} from "@/lib/dashboard-kpis";
import {
  getCompletedSessionStatsByOrganizationUsers,
  getCompletedSessionStatsForMember,
} from "@/lib/completed-session-counts";
import { getLatestCopeCartSubscriptionsForOrganizations } from "@/lib/copecart-subscriptions";
import { resolveIndustrySettings } from "@/lib/industries";
import {
  isOrganizationAdminAuthFailure,
  requireOrganizationAdmin,
} from "@/lib/organization-admin-server";
import {
  getSupabaseServerClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";

type SubscriptionRecord = {
  current_period_end: string | null;
  plan_key: string;
  status: string;
};

type CopeCartSubscriptionRecord = {
  copecart_order_id: string | null;
  copecart_product_id: string | null;
  current_period_paid_until: string | null;
  grace_period_until: string | null;
  last_ipn_event_at: string | null;
  last_payment_at: string | null;
  payment_failed_at: string | null;
  payment_failure_email_sent_at: string | null;
  subscription_status: string;
};

type InvitationRecord = {
  created_at: string;
  email: string | null;
  expires_at: string | null;
  id: string;
  role_to_assign: string;
};

type MembershipRecord = {
  role_in_org: string;
  user_id: string;
};

type ProfileRecord = {
  first_name: string | null;
  full_name: string | null;
  id: string;
  is_active: boolean;
  last_name: string | null;
  role: string | null;
};

type LastActivityRecord = {
  updated_at: string;
  user_id: string;
};

function getDisplayName(profile: ProfileRecord | undefined) {
  if (!profile) {
    return null;
  }

  return (
    profile.full_name?.trim() ||
    [profile.first_name?.trim(), profile.last_name?.trim()]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    null
  );
}

export async function GET(request: Request) {
  try {
    const authResult = await requireOrganizationAdmin(
      request.headers.get("authorization")
    );

    if (isOrganizationAdminAuthFailure(authResult)) {
      let debug:
        | {
            memberships: Array<{
              organization_id: string;
              role_in_org: string;
            }>;
            tokenUserId: string | null;
            profile: { is_active: boolean; role: string | null } | null;
          }
        | undefined;
      if (authResult.status === 403) {
        const authorizationHeader = request.headers.get("authorization");
        const accessToken = authorizationHeader?.startsWith("Bearer ")
          ? authorizationHeader.slice("Bearer ".length)
          : undefined;
        const tokenClient = accessToken ? getSupabaseServerClient(accessToken) : null;
        const serviceRoleClient = getSupabaseServiceRoleClient();
        const {
          data: { user },
        } = tokenClient ? await tokenClient.auth.getUser() : { data: { user: null } };

        let profile: { is_active: boolean; role: string | null } | null = null;
        let memberships: Array<{ organization_id: string; role_in_org: string }> = [];
        if (user?.id && serviceRoleClient) {
          const [{ data: profileData }, { data: membershipsData }] = await Promise.all([
            serviceRoleClient
              .from("profiles")
              .select("role, is_active")
              .eq("id", user.id)
              .maybeSingle<{ is_active: boolean; role: string | null }>(),
            serviceRoleClient
              .from("organization_members")
              .select("organization_id, role_in_org")
              .eq("user_id", user.id),
          ]);
          profile = profileData ?? null;
          memberships = (membershipsData ??
            []) as Array<{ organization_id: string; role_in_org: string }>;
        }

        debug = {
          memberships,
          tokenUserId: user?.id ?? null,
          profile,
        };
      }

      return NextResponse.json(
        { debug, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { membership, serviceRoleClient } = authResult;
    const organization = membership.organizations;
    const resolvedIndustrySettings = resolveIndustrySettings(organization);

    if (!organization) {
      return NextResponse.json(
        { error: "Organisation konnte nicht aufgelöst werden." },
        { status: 500 }
      );
    }

    const [subscriptionResult, membersResult, profilesResult, copecartSubscriptions] =
      await Promise.all([
      serviceRoleClient
        .from("subscriptions")
        .select("plan_key, status, current_period_end")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<SubscriptionRecord>(),
      serviceRoleClient
        .from("organization_members")
        .select("user_id, role_in_org")
        .eq("organization_id", membership.organization_id),
      serviceRoleClient
        .from("profiles")
        .select("id, full_name, first_name, last_name, role, is_active"),
      getLatestCopeCartSubscriptionsForOrganizations(serviceRoleClient, [
        membership.organization_id,
      ]),
    ]);

    const { data: invitations, error: invitationsError } = await serviceRoleClient
      .from("invitations")
      .select("id, email, role_to_assign, expires_at, created_at")
      .eq("organization_id", membership.organization_id)
      .is("accepted_at", null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });

    if (subscriptionResult.error) {
      throw new Error(subscriptionResult.error.message);
    }

    if (membersResult.error) {
      throw new Error(membersResult.error.message);
    }

    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    if (invitationsError) {
      throw new Error(invitationsError.message);
    }

    const latestCopeCartSubscription = copecartSubscriptions.get(
      membership.organization_id
    ) as CopeCartSubscriptionRecord | undefined;
    const resolvedSeatLimit = resolveOrganizationSeatLimit({
      copecartProductId: latestCopeCartSubscription?.copecart_product_id ?? null,
      planKey: subscriptionResult.data?.plan_key ?? null,
      seatLimit: organization.seat_limit,
    });

    const members = (membersResult.data ?? []) as MembershipRecord[];
    const profiles = (profilesResult.data ?? []) as ProfileRecord[];
    const pendingInvitations = (invitations ?? []) as InvitationRecord[];
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const completedSessionStats = await getCompletedSessionStatsByOrganizationUsers(
      serviceRoleClient,
      [membership.organization_id],
      members.map((member) => member.user_id)
    );

    const memberDetails = await Promise.all(
      members.map(async (member) => {
        const memberProfile = profileMap.get(member.user_id);
        const sessionStats = getCompletedSessionStatsForMember(
          completedSessionStats,
          membership.organization_id,
          member.user_id
        );
        const { data, error } =
          await serviceRoleClient.auth.admin.getUserById(member.user_id);

        if (error) {
          throw new Error(error.message);
        }

        return {
          completedSessionCount: sessionStats.total,
          completedSessionsByType: sessionStats.byFlow,
          email: data.user.email ?? null,
          id: member.user_id,
          isActive: memberProfile?.is_active ?? true,
          isSeatOccupied: true,
          name: getDisplayName(memberProfile),
          platformRole: memberProfile?.role ?? null,
          roleInOrg: member.role_in_org,
        };
      })
    );

    const { data: latestSessions, error: latestSessionsError } = await serviceRoleClient
      .from("chat_sessions")
      .select("user_id, updated_at")
      .eq("organization_id", membership.organization_id)
      .in(
        "user_id",
        members.map((member) => member.user_id)
      )
      .order("updated_at", { ascending: false });

    if (latestSessionsError) {
      throw new Error(latestSessionsError.message);
    }

    const lastActivityMap = new Map<string, string>();

    for (const session of ((latestSessions ?? []) as LastActivityRecord[])) {
      if (!lastActivityMap.has(session.user_id)) {
        lastActivityMap.set(session.user_id, session.updated_at);
      }
    }

    const teamKpis = await Promise.all(
      memberDetails.map(async (member) => {
        let kpiSummary: DashboardKpiSummary;

        try {
          kpiSummary = await getDashboardKpiSummaryForUser(
            serviceRoleClient,
            member.id
          );
        } catch {
          kpiSummary = {
            ...getDashboardKpiSummaryForUserFallback(),
          };
        }

        return {
          ...member,
          kpiSummary,
          lastActivityAt: lastActivityMap.get(member.id) ?? null,
        };
      })
    );

    return NextResponse.json({
      organization: {
        freeSeats: Math.max(
          resolvedSeatLimit.seatLimit - memberDetails.length - pendingInvitations.length,
          0
        ),
        id: organization.id,
        industryKey: resolvedIndustrySettings.industryKey,
        industryLocked: resolvedIndustrySettings.industryLocked,
        isActive: organization.is_active,
        memberCount: memberDetails.length,
        members: teamKpis,
        organizationName: organization.organization_name,
        packageLabel: getPackageLabel({
          copecartProductId: latestCopeCartSubscription?.copecart_product_id ?? null,
          planKey: subscriptionResult.data?.plan_key ?? null,
          seatLimit: resolvedSeatLimit.seatLimit,
        }),
        pendingInvitationCount: pendingInvitations.length,
        pendingInvitations: pendingInvitations.map((invitation) => ({
          createdAt: invitation.created_at,
          email: invitation.email,
          expiresAt: invitation.expires_at,
          id: invitation.id,
          roleToAssign: invitation.role_to_assign,
        })),
        planKey: subscriptionResult.data?.plan_key ?? null,
        promptProfileKey: resolvedIndustrySettings.promptProfileKey,
        seatLimit: resolvedSeatLimit.seatLimit,
        seatLimitSource: resolvedSeatLimit.source,
        validUntil: subscriptionResult.data?.current_period_end ?? null,
        copecart: latestCopeCartSubscription
          ? {
              lastIpnEventAt: latestCopeCartSubscription.last_ipn_event_at,
              lastPaymentAt: latestCopeCartSubscription.last_payment_at,
              orderId: latestCopeCartSubscription.copecart_order_id,
              paidUntil: latestCopeCartSubscription.current_period_paid_until,
              paymentFailedAt: latestCopeCartSubscription.payment_failed_at,
              paymentFailureEmailSentAt:
                latestCopeCartSubscription.payment_failure_email_sent_at,
              productId: latestCopeCartSubscription.copecart_product_id,
              gracePeriodUntil: latestCopeCartSubscription.grace_period_until,
              subscriptionStatus: latestCopeCartSubscription.subscription_status,
            }
          : null,
        subscriptionStatus: subscriptionResult.data?.status ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die Organisations-Verwaltung konnte nicht geladen werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getDashboardKpiSummaryForUserFallback(): DashboardKpiSummary {
  return buildDashboardKpiSummary([], 0, [], 0, [], 0, 0);
}
