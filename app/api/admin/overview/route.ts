import { NextResponse } from "next/server";

import {
  getPackageLabel,
  resolveOrganizationSeatLimit,
} from "@/lib/copecart-products";
import {
  getCompletedSessionStatsByOrganizationUsers,
  getCompletedSessionStatsForMember,
} from "@/lib/completed-session-counts";
import { isAdminAuthFailure, requireMasterAdmin } from "@/lib/admin-server";
import { getLatestCopeCartSubscriptionsForOrganizations } from "@/lib/copecart-subscriptions";
import { resolveIndustrySettings } from "@/lib/industries";
import {
  getSupabaseServerClient,
  getSupabaseServiceRoleClient,
  type SupabaseServerClient,
} from "@/lib/supabase-server";

type OrganizationRecord = {
  created_at: string;
  franchise_vertical?: string | null;
  id: string;
  industry_key: string | null;
  industry_locked: boolean | null;
  is_active: boolean;
  organization_name: string;
  prompt_profile_key: string | null;
  seat_limit: number;
};

type SubscriptionRecord = {
  created_at: string;
  current_period_end: string | null;
  organization_id: string;
  plan_key: string;
  status: string;
};

type CopeCartSubscriptionRecord = {
  copecart_order_id: string | null;
  copecart_product_id: string | null;
  created_at: string;
  current_period_paid_until: string | null;
  grace_period_until: string | null;
  last_ipn_event_at: string | null;
  last_payment_at: string | null;
  organization_id: string | null;
  payment_failed_at: string | null;
  payment_failure_email_sent_at: string | null;
  subscription_status: string;
};

type MembershipRecord = {
  organization_id: string;
  role_in_org: string;
  user_id: string;
};

type InvitationRecord = {
  accepted_at: string | null;
  created_at: string;
  expires_at: string | null;
  id: string;
  organization_id: string;
};

type SignupOrderMetadata = {
  amount: string | null;
  customerEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  orderId: string | null;
  vatAmount: string | null;
};

type ProfileRecord = {
  first_name: string | null;
  full_name: string | null;
  id: string;
  is_active: boolean;
  last_name: string | null;
  role: string | null;
};

type SystemEventRecord = {
  alert_sent_at: string | null;
  created_at: string;
  environment: string | null;
  id: string;
  message: string;
  severity: "critical" | "error" | "info" | "warning";
  source: string;
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

async function listAuthUserEmails(serviceRoleClient: SupabaseServerClient) {
  const authUserMap = new Map<
    string,
    { email: string | null; signupOrder: SignupOrderMetadata | null }
  >();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await serviceRoleClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(error.message);
    }

    for (const user of data.users) {
      authUserMap.set(user.id, {
        email: user.email ?? null,
        signupOrder:
          user.user_metadata?.cope_cart_order_id ||
          user.user_metadata?.cope_cart_customer_email ||
          user.user_metadata?.cope_cart_amount
            ? {
                amount:
                  typeof user.user_metadata?.cope_cart_amount === "string"
                    ? user.user_metadata.cope_cart_amount
                    : null,
                customerEmail:
                  typeof user.user_metadata?.cope_cart_customer_email === "string"
                    ? user.user_metadata.cope_cart_customer_email
                    : null,
                firstName:
                  typeof user.user_metadata?.cope_cart_first_name === "string"
                    ? user.user_metadata.cope_cart_first_name
                    : null,
                lastName:
                  typeof user.user_metadata?.cope_cart_last_name === "string"
                    ? user.user_metadata.cope_cart_last_name
                    : null,
                orderId:
                  typeof user.user_metadata?.cope_cart_order_id === "string"
                    ? user.user_metadata.cope_cart_order_id
                    : null,
                vatAmount:
                  typeof user.user_metadata?.cope_cart_vat_amount === "string"
                    ? user.user_metadata.cope_cart_vat_amount
                    : null,
              }
            : null,
      });
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return authUserMap;
}

export async function GET(request: Request) {
  try {
    const adminAuth = await requireMasterAdmin(
      request.headers.get("authorization")
    );

    if (isAdminAuthFailure(adminAuth)) {
      let debug:
        | {
            tokenUserId: string | null;
            profile: { is_active: boolean; role: string | null } | null;
          }
        | undefined;
      if (adminAuth.status === 403) {
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
        if (user?.id && serviceRoleClient) {
          const { data } = await serviceRoleClient
            .from("profiles")
            .select("role, is_active")
            .eq("id", user.id)
            .maybeSingle<{ is_active: boolean; role: string | null }>();
          profile = data ?? null;
        }

        debug = {
          tokenUserId: user?.id ?? null,
          profile,
        };
      }

      return NextResponse.json(
        { debug, error: adminAuth.error },
        { status: adminAuth.status }
      );
    }

    const { serviceRoleClient } = adminAuth;

    const { data: organizationsData, error: organizationsError } =
      await serviceRoleClient
        .from("organizations")
        .select(
          "id, organization_name, seat_limit, is_active, created_at, industry_key, prompt_profile_key, industry_locked, franchise_vertical"
        )
        .order("organization_name", { ascending: true });

    const organizationsResult = organizationsError?.message?.includes(
      "franchise_vertical"
    )
      ? await serviceRoleClient
          .from("organizations")
          .select(
            "id, organization_name, seat_limit, is_active, created_at, industry_key, prompt_profile_key, industry_locked"
          )
          .order("organization_name", { ascending: true })
      : { data: organizationsData, error: organizationsError };

    const [
      subscriptionsResult,
      membershipsResult,
      invitationsResult,
      profilesResult,
      systemEventsResult,
      emailMap,
    ] = await Promise.all([
      serviceRoleClient
        .from("subscriptions")
        .select("organization_id, plan_key, status, created_at, current_period_end")
        .order("created_at", { ascending: false }),
      serviceRoleClient
        .from("organization_members")
        .select("organization_id, user_id, role_in_org"),
      serviceRoleClient
        .from("invitations")
        .select("id, organization_id, created_at, expires_at, accepted_at")
        .is("accepted_at", null),
      serviceRoleClient
        .from("profiles")
        .select("id, full_name, first_name, last_name, role, is_active"),
      serviceRoleClient
        .from("system_event_log")
        .select(
          "id, severity, source, message, environment, alert_sent_at, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(10),
      listAuthUserEmails(serviceRoleClient),
    ]);

    if (organizationsResult.error) {
      throw new Error(organizationsResult.error.message);
    }

    if (subscriptionsResult.error) {
      throw new Error(subscriptionsResult.error.message);
    }

    if (membershipsResult.error) {
      throw new Error(membershipsResult.error.message);
    }

    if (invitationsResult.error) {
      throw new Error(invitationsResult.error.message);
    }

    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    if (systemEventsResult.error) {
      throw new Error(systemEventsResult.error.message);
    }

    const organizations = (organizationsResult.data ?? []) as OrganizationRecord[];
    const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRecord[];
    const memberships = (membershipsResult.data ?? []) as MembershipRecord[];
    const invitations = (invitationsResult.data ?? []) as InvitationRecord[];
    const profiles = (profilesResult.data ?? []) as ProfileRecord[];
    const systemEvents = (systemEventsResult.data ?? []) as SystemEventRecord[];

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const latestSubscriptionByOrganization = new Map<string, SubscriptionRecord>();
    const latestCopeCartSubscriptionByOrganization =
      await getLatestCopeCartSubscriptionsForOrganizations(
        serviceRoleClient,
        organizations.map((organization) => organization.id)
      );
    const completedSessionStats = await getCompletedSessionStatsByOrganizationUsers(
      serviceRoleClient,
      organizations.map((organization) => organization.id),
      memberships.map((membership) => membership.user_id)
    );

    for (const subscription of subscriptions) {
      if (!latestSubscriptionByOrganization.has(subscription.organization_id)) {
        latestSubscriptionByOrganization.set(
          subscription.organization_id,
          subscription
        );
      }
    }

    const overview = organizations.map((organization) => {
      const resolvedIndustrySettings = resolveIndustrySettings(organization);
      const organizationMembers = memberships.filter(
        (membership) => membership.organization_id === organization.id
      );
      const ownerMembership =
        organizationMembers.find(
          (membership) => membership.role_in_org === "admin"
        ) ?? organizationMembers[0];
      const ownerProfile = ownerMembership
        ? profileMap.get(ownerMembership.user_id)
        : undefined;
      const ownerEmail = ownerMembership
        ? emailMap.get(ownerMembership.user_id)?.email ?? null
        : null;
      const ownerSignupOrder = ownerMembership
        ? emailMap.get(ownerMembership.user_id)?.signupOrder ?? null
        : null;
      const latestSubscription = latestSubscriptionByOrganization.get(
        organization.id
      );
      const latestCopeCartSubscription = latestCopeCartSubscriptionByOrganization.get(
        organization.id
      ) as CopeCartSubscriptionRecord | undefined;
      const pendingInvitationCount = invitations.filter(
        (invitation) =>
          invitation.organization_id === organization.id &&
          invitation.accepted_at === null &&
          (!invitation.expires_at || new Date(invitation.expires_at) > new Date())
      ).length;
      const resolvedSeatLimit = resolveOrganizationSeatLimit({
        copecartProductId: latestCopeCartSubscription?.copecart_product_id ?? null,
        planKey: latestSubscription?.plan_key ?? null,
        seatLimit: organization.seat_limit,
      });

      return {
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
        createdAt: organization.created_at,
        franchiseVertical:
          resolvedIndustrySettings.industryKey === "franchise"
            ? resolvedIndustrySettings.franchiseVertical
            : null,
        id: organization.id,
        industryKey: resolvedIndustrySettings.industryKey,
        industryLocked: resolvedIndustrySettings.industryLocked,
        isActive: organization.is_active,
        memberCount: organizationMembers.length,
        members: organizationMembers.map((membership) => {
          const memberProfile = profileMap.get(membership.user_id);
          const sessionStats = getCompletedSessionStatsForMember(
            completedSessionStats,
            organization.id,
            membership.user_id
          );

          return {
            completedSessionCount: sessionStats.total,
            completedSessionsByType: sessionStats.byFlow,
            email: emailMap.get(membership.user_id)?.email ?? null,
            id: membership.user_id,
            isActive: memberProfile?.is_active ?? true,
            name: getDisplayName(memberProfile),
            platformRole: memberProfile?.role ?? null,
            roleInOrg: membership.role_in_org,
            signupOrder: emailMap.get(membership.user_id)?.signupOrder ?? null,
          };
        }),
        organizationName: organization.organization_name,
        owner: {
          email: ownerEmail,
          id: ownerMembership?.user_id ?? null,
          name: getDisplayName(ownerProfile),
          signupOrder: ownerSignupOrder,
        },
        packageLabel: getPackageLabel({
          copecartProductId: latestCopeCartSubscription?.copecart_product_id ?? null,
          planKey: latestSubscription?.plan_key ?? null,
          seatLimit: resolvedSeatLimit.seatLimit,
        }),
        pendingInvitationCount,
        planKey: latestSubscription?.plan_key ?? null,
        promptProfileKey: resolvedIndustrySettings.promptProfileKey,
        seatLimit: resolvedSeatLimit.seatLimit,
        seatLimitSource: resolvedSeatLimit.source,
        validUntil: latestSubscription?.current_period_end ?? null,
        subscriptionStatus: latestSubscription?.status ?? null,
        availableSeats: Math.max(
          resolvedSeatLimit.seatLimit - organizationMembers.length - pendingInvitationCount,
          0
        ),
      };
    });

    return NextResponse.json({
      organizations: overview,
      systemEvents: systemEvents.map((event) => ({
        alertSentAt: event.alert_sent_at,
        createdAt: event.created_at,
        environment: event.environment,
        id: event.id,
        message: event.message,
        severity: event.severity,
        source: event.source,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die Admin-Daten konnten nicht geladen werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
