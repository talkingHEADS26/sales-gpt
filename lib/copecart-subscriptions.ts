import crypto from "node:crypto";

import {
  getPackageLabel,
  getSeatLimitForCopeCartProduct,
  getSeatLimitForPlanKey,
  resolveOrganizationSeatLimit,
} from "@/lib/copecart-products";
import { sendCopeCartPaymentFailedWarningEmail } from "@/lib/email/send-copecart-payment-failed-warning";
import {
  getServiceRoleClientInitError,
  getSupabaseServerClient,
  getSupabaseServerClientInitError,
  getSupabaseServiceRoleClient,
  type SupabaseServerClient,
} from "@/lib/supabase-server";
import { logSystemEvent } from "@/lib/system-monitoring";

export type CopeCartSubscriptionStatus =
  | "active"
  | "cancelled"
  | "chargeback"
  | "expired"
  | "past_due"
  | "payment_failed"
  | "pending"
  | "refunded"
  | "unknown";

type CopeCartSubscriptionRecord = {
  copecart_customer_email: string | null;
  copecart_order_id: string | null;
  copecart_product_id: string | null;
  created_at: string;
  current_period_paid_until: string | null;
  grace_period_until: string | null;
  id: string;
  last_ipn_event_at: string | null;
  last_payment_at: string | null;
  organization_id: string | null;
  payment_failed_at: string | null;
  payment_failure_email_sent_at: string | null;
  subscription_status: CopeCartSubscriptionStatus;
  updated_at: string;
  user_id: string | null;
};

type CopeCartIpnEventInsert = {
  amount: string | null;
  copecart_customer_email: string | null;
  copecart_order_id: string | null;
  copecart_product_id: string | null;
  event_key: string;
  event_type: string;
  payload: Record<string, unknown>;
  processing_status?: "duplicate" | "failed" | "ignored" | "processed" | "received";
  processed_at?: string | null;
  raw_event_id: string | null;
};

type ProfileAccessRecord = {
  first_name?: string | null;
  id: string;
  is_active: boolean;
  role: string | null;
};

type AuthUserWithMetadata = {
  email: string | null;
  id: string;
  user_metadata?: Record<string, unknown>;
};

type MembershipRecord = {
  created_at: string;
  organization_id: string;
  organizations:
    | {
        id: string;
        is_active: boolean;
        organization_name: string;
      }
    | {
        id: string;
        is_active: boolean;
        organization_name: string;
      }[]
    | null;
  role_in_org: string;
};

type LegacyOrganizationSubscriptionRecord = {
  created_at: string;
  current_period_end: string | null;
  organization_id: string;
  plan_key: string;
  status: string;
};

type AuthUserSummary = {
  email: string | null;
  id: string;
  user_metadata?: Record<string, unknown>;
};

type SubscriptionOwnerContact = {
  email: string;
  firstName: string | null;
  userId: string;
};

export type AccessStateCode =
  | "account_inactive"
  | "organization_inactive"
  | "subscription_expired"
  | "subscription_inactive"
  | "subscription_missing";

export type AppAccessState =
  | {
      allowed: true;
      code: null;
      message: null;
      organizationId: string | null;
      subscription: CopeCartSubscriptionRecord | null;
      usedLegacyFallback: boolean;
      userId: string;
    }
  | {
      allowed: false;
      code: AccessStateCode;
      message: string;
      organizationId: string | null;
      subscription: CopeCartSubscriptionRecord | null;
      usedLegacyFallback: boolean;
      userId: string;
    };

type AppAuthSuccess = {
  serviceRoleClient: SupabaseServerClient;
  supabase: SupabaseServerClient;
  userId: string;
};

type AppAuthFailure = {
  code?: AccessStateCode;
  error: string;
  status: number;
};

export type AppAuthResult = AppAuthFailure | AppAuthSuccess;

export function isFailure(result: AppAuthResult): result is AppAuthFailure {
  return "status" in result;
}

export type NormalizedCopeCartIpnEvent = {
  amount: string | null;
  currentPeriodPaidUntil: string | null;
  customerEmail: string | null;
  eventAt: string;
  eventKey: string;
  eventType: string;
  orderId: string | null;
  paymentAt: string | null;
  productId: string | null;
  rawEventId: string | null;
  rawPayload: Record<string, unknown>;
  status: string | null;
};

export type ProcessCopeCartIpnResult = {
  duplicate: boolean;
  eventType: string;
  message: string;
  orderId: string | null;
  processed: boolean;
  subscriptionStatus: CopeCartSubscriptionStatus | null;
  targetOrganizationId: string | null;
  targetUserId: string | null;
};

function normalizeText(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeEmail(value: string | null | undefined) {
  const normalizedValue = normalizeText(value);

  return normalizedValue ? normalizedValue.toLowerCase() : null;
}

function readMetadataText(
  metadata: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string") {
      const normalizedValue = normalizeText(value);

      if (normalizedValue) {
        return normalizedValue;
      }
    }
  }

  return null;
}

async function ensureOrgSignupAccessBootstrap(params: {
  serviceRoleClient: SupabaseServerClient;
  userId: string;
}) {
  const { data: userData, error: userError } =
    await params.serviceRoleClient.auth.admin.getUserById(params.userId);

  if (userError || !userData.user) {
    return false;
  }

  const authUser = userData.user as AuthUserWithMetadata;
  const metadata = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const registrationMode = readMetadataText(metadata, "registration_mode");

  if (registrationMode !== "organization_signup") {
    return false;
  }

  const firstName = readMetadataText(metadata, "first_name");
  const lastName = readMetadataText(metadata, "last_name");
  const username =
    readMetadataText(metadata, "username") ??
    normalizeEmail(authUser.email) ??
    params.userId;
  const licensePlan = readMetadataText(metadata, "license_plan") ?? "solo";
  const organizationName =
    readMetadataText(metadata, "organization_name") ?? "Neue Organisation";
  const industryKey = readMetadataText(metadata, "industry_key") ?? "fitness";
  const franchiseVertical =
    industryKey === "franchise"
      ? readMetadataText(metadata, "franchise_vertical") ?? "other"
      : null;
  const seatLimit = getSeatLimitForPlanKey(licensePlan) ?? 1;

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  const { data: currentProfile } = await params.serviceRoleClient
    .from("profiles")
    .select("id, is_active")
    .eq("id", params.userId)
    .maybeSingle<{ id: string; is_active: boolean }>();

  if (!currentProfile) {
    const { error: createProfileError } = await params.serviceRoleClient
      .from("profiles")
      .insert({
        first_name: firstName,
        full_name: fullName,
        id: params.userId,
        is_active: true,
        last_name: lastName,
        role: "user",
        username,
      });

    if (createProfileError) {
      return false;
    }
  } else if (!currentProfile.is_active) {
    const { error: activateProfileError } = await params.serviceRoleClient
      .from("profiles")
      .update({ is_active: true })
      .eq("id", params.userId);

    if (activateProfileError) {
      return false;
    }
  }

  const { data: existingMembership } = await params.serviceRoleClient
    .from("organization_members")
    .select("organization_id, role_in_org")
    .eq("user_id", params.userId)
    .eq("role_in_org", "admin")
    .limit(1)
    .maybeSingle<{ organization_id: string; role_in_org: string }>();

  let organizationId = existingMembership?.organization_id ?? null;

  if (!organizationId) {
    const { data: createdOrganization, error: createOrganizationError } =
      await params.serviceRoleClient
        .from("organizations")
        .insert({
          franchise_vertical: franchiseVertical,
          industry_key: industryKey,
          is_active: true,
          organization_name: organizationName,
          prompt_profile_key: industryKey,
          seat_limit: seatLimit,
        })
        .select("id")
        .single<{ id: string }>();

    if (createOrganizationError || !createdOrganization) {
      return false;
    }

    organizationId = createdOrganization.id;

    const { error: createMembershipError } = await params.serviceRoleClient
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        role_in_org: "admin",
        user_id: params.userId,
      });

    if (createMembershipError) {
      return false;
    }
  }

  if (!organizationId) {
    return false;
  }

  const { data: existingSubscription } = await params.serviceRoleClient
    .from("subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!existingSubscription) {
    const { error: createSubscriptionError } = await params.serviceRoleClient
      .from("subscriptions")
      .insert({
        organization_id: organizationId,
        plan_key: licensePlan,
        status: "active",
      });

    if (createSubscriptionError) {
      return false;
    }
  }

  await params.serviceRoleClient
    .from("organizations")
    .update({ is_active: true })
    .eq("id", organizationId);

  return true;
}

function normalizeStatusKeyword(value: string | null | undefined) {
  const normalizedValue = normalizeText(value);

  return normalizedValue ? normalizedValue.toLowerCase() : null;
}

function isAllowAllSubscriptionsEnabled() {
  // TODO: REMOVE AFTER SUBSCRIPTION DEBUGGING
  return (
    normalizeStatusKeyword(process.env.ALLOW_ALL_SUBSCRIPTIONS) === "true"
  );
}

function toIsoDate(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestamp = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(timestamp);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^\d+$/.test(trimmedValue)) {
    return toIsoDate(Number.parseInt(trimmedValue, 10));
  }

  const date = new Date(trimmedValue);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getRecordValue(
  payload: Record<string, unknown>,
  keys: readonly string[]
): unknown {
  for (const key of keys) {
    if (key in payload) {
      return payload[key];
    }
  }

  return undefined;
}

function getStringValue(
  payload: Record<string, unknown>,
  keys: readonly string[]
) {
  const value = getRecordValue(payload, keys);

  if (typeof value === "string") {
    return normalizeText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function getDateValue(
  payload: Record<string, unknown>,
  keys: readonly string[]
) {
  const value = getRecordValue(payload, keys);

  if (typeof value === "string" || typeof value === "number") {
    return toIsoDate(value);
  }

  return null;
}

function getCurrentPeriodPaidUntil(
  payload: Record<string, unknown>,
  eventAt: string
) {
  return (
    getDateValue(payload, [
      "current_period_paid_until",
      "currentPeriodPaidUntil",
      "paid_until",
      "paidUntil",
      "access_until",
      "accessUntil",
      "subscription_end",
      "subscriptionEnd",
      "period_end",
      "periodEnd",
      "next_payment_date",
      "nextPaymentDate",
      "next_billing_date",
      "nextBillingDate",
      "next_rebill_at",
      "nextRebillAt",
    ]) ?? eventAt
  );
}

function buildEventKey(params: {
  eventAt: string;
  eventType: string;
  orderId: string | null;
  rawBody: string;
  rawEventId: string | null;
}) {
  if (params.rawEventId) {
    return params.rawEventId;
  }

  if (params.orderId) {
    return `${params.orderId}:${params.eventType}:${params.eventAt}`;
  }

  return crypto.createHash("sha256").update(params.rawBody).digest("hex");
}

function shouldBlockCancellationImmediately() {
  return process.env.COPECART_CANCEL_BLOCKS_IMMEDIATELY?.trim() !== "false";
}

function getGracePeriodUntilIso(baseDate = new Date()) {
  return new Date(baseDate.getTime() + 72 * 60 * 60 * 1000).toISOString();
}

function isFutureIsoDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

function inferPositiveEventStatus(event: NormalizedCopeCartIpnEvent) {
  const normalizedEvent = `${event.eventType} ${event.status ?? ""}`.toLowerCase();

  return (
    normalizedEvent.includes("payment") ||
    normalizedEvent.includes("sale") ||
    normalizedEvent.includes("purchase") ||
    normalizedEvent.includes("rebill") ||
    normalizedEvent.includes("renew") ||
    normalizedEvent.includes("subscription") ||
    normalizedEvent.includes("paid") ||
    normalizedEvent.includes("success") ||
    normalizedEvent.includes("completed")
  );
}

function mapIpnEventToSubscriptionStatus(event: NormalizedCopeCartIpnEvent): {
  allowAccessUntilPeriodEnd: boolean;
  shouldUpdateAccess: boolean;
  status: CopeCartSubscriptionStatus | null;
} {
  const normalizedEvent = `${event.eventType} ${event.status ?? ""}`.toLowerCase();

  if (normalizedEvent.includes("chargeback")) {
    return {
      allowAccessUntilPeriodEnd: false,
      shouldUpdateAccess: true,
      status: "chargeback",
    };
  }

  if (normalizedEvent.includes("refund")) {
    return {
      allowAccessUntilPeriodEnd: false,
      shouldUpdateAccess: true,
      status: "refunded",
    };
  }

  if (
    normalizedEvent.includes("cancel") ||
    normalizedEvent.includes("canceled") ||
    normalizedEvent.includes("cancelled") ||
    normalizedEvent.includes("storno")
  ) {
    return {
      allowAccessUntilPeriodEnd:
        !shouldBlockCancellationImmediately() &&
        Boolean(event.currentPeriodPaidUntil),
      shouldUpdateAccess: true,
      status: "cancelled",
    };
  }

  if (
    normalizedEvent.includes("fail") ||
    normalizedEvent.includes("declin") ||
    normalizedEvent.includes("unpaid") ||
    normalizedEvent.includes("dunning")
  ) {
    return {
      allowAccessUntilPeriodEnd: false,
      shouldUpdateAccess: true,
      status: "past_due",
    };
  }

  if (inferPositiveEventStatus(event)) {
    return {
      allowAccessUntilPeriodEnd: false,
      shouldUpdateAccess: true,
      status: "active",
    };
  }

  return {
    allowAccessUntilPeriodEnd: false,
    shouldUpdateAccess: false,
    status: null,
  };
}

function isSubscriptionCurrentlyEntitled(subscription: CopeCartSubscriptionRecord) {
  const paidUntil = subscription.current_period_paid_until
    ? new Date(subscription.current_period_paid_until)
    : null;
  const hasValidPaidUntil =
    paidUntil !== null && !Number.isNaN(paidUntil.getTime());
  const paidUntilMs = hasValidPaidUntil ? paidUntil!.getTime() : null;

  if (subscription.subscription_status === "active") {
    return paidUntilMs !== null && paidUntilMs >= Date.now();
  }

  if (
    subscription.subscription_status === "past_due" &&
    isFutureIsoDate(subscription.grace_period_until)
  ) {
    return true;
  }

  return (
    subscription.subscription_status === "cancelled" &&
    !shouldBlockCancellationImmediately() &&
    paidUntilMs !== null &&
    paidUntilMs >= Date.now()
  );
}

function getMembershipOrganization(membership: MembershipRecord) {
  if (Array.isArray(membership.organizations)) {
    return membership.organizations[0] ?? null;
  }

  return membership.organizations;
}

async function getLatestLegacySubscriptionsForOrganizations(
  serviceRoleClient: SupabaseServerClient,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) {
    return new Map<string, LegacyOrganizationSubscriptionRecord>();
  }

  const { data, error } = await serviceRoleClient
    .from("subscriptions")
    .select("organization_id, plan_key, status, created_at, current_period_end")
    .in("organization_id", organizationIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const latestByOrganization = new Map<string, LegacyOrganizationSubscriptionRecord>();

  for (const subscription of (data ?? []) as LegacyOrganizationSubscriptionRecord[]) {
    if (!latestByOrganization.has(subscription.organization_id)) {
      latestByOrganization.set(subscription.organization_id, subscription);
    }
  }

  return latestByOrganization;
}

function isLegacyManualSubscriptionEntitled(
  subscription: LegacyOrganizationSubscriptionRecord | null
) {
  if (!subscription || subscription.plan_key !== "manual") {
    return false;
  }

  if (subscription.status === "manual_active") {
    return (
      typeof subscription.current_period_end === "string" &&
      new Date(subscription.current_period_end).getTime() > Date.now()
    );
  }

  return subscription.status === "active";
}

function isLegacyManualSubscriptionExpired(
  subscription: LegacyOrganizationSubscriptionRecord | null
) {
  if (!subscription || subscription.plan_key !== "manual") {
    return false;
  }

  if (subscription.status === "manual_expired") {
    return true;
  }

  return (
    subscription.status === "manual_active" &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end).getTime() <= Date.now())
  );
}

async function getLatestSubscriptionsForTargets(
  serviceRoleClient: SupabaseServerClient,
  filterColumn: "organization_id" | "user_id",
  ids: string[]
) {
  if (ids.length === 0) {
    return new Map<string, CopeCartSubscriptionRecord>();
  }

  const { data, error } = await serviceRoleClient
    .from("copecart_subscriptions")
    .select(
      "id, user_id, organization_id, copecart_order_id, copecart_product_id, copecart_customer_email, subscription_status, last_payment_at, current_period_paid_until, grace_period_until, payment_failed_at, payment_failure_email_sent_at, last_ipn_event_at, created_at, updated_at"
    )
    .in(filterColumn, ids)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const latestByTarget = new Map<string, CopeCartSubscriptionRecord>();

  for (const subscription of (data ?? []) as CopeCartSubscriptionRecord[]) {
    const targetId =
      filterColumn === "organization_id"
        ? subscription.organization_id
        : subscription.user_id;

    if (!targetId || latestByTarget.has(targetId)) {
      continue;
    }

    latestByTarget.set(targetId, subscription);
  }

  return latestByTarget;
}

export async function getLatestCopeCartSubscriptionsForOrganizations(
  serviceRoleClient: SupabaseServerClient,
  organizationIds: string[]
) {
  return getLatestSubscriptionsForTargets(
    serviceRoleClient,
    "organization_id",
    organizationIds
  );
}

export async function getLatestCopeCartSubscriptionsForUsers(
  serviceRoleClient: SupabaseServerClient,
  userIds: string[]
) {
  return getLatestSubscriptionsForTargets(serviceRoleClient, "user_id", userIds);
}

export async function resolveAppAccessStateForUser(params: {
  serviceRoleClient: SupabaseServerClient;
  userId: string;
}): Promise<AppAccessState> {
  const { serviceRoleClient, userId } = params;
  const allowAllSubscriptions = isAllowAllSubscriptionsEnabled();
  let { data: profile, error: profileError } = await serviceRoleClient
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", userId)
    .maybeSingle<ProfileAccessRecord>();

  if (profileError || !profile || !profile.is_active) {
    const repaired = await ensureOrgSignupAccessBootstrap({
      serviceRoleClient,
      userId,
    });

    if (repaired) {
      const refreshResult = await serviceRoleClient
        .from("profiles")
        .select("id, role, is_active")
        .eq("id", userId)
        .maybeSingle<ProfileAccessRecord>();

      profile = refreshResult.data ?? null;
      profileError = refreshResult.error ?? null;
    }
  }

  if (profileError || !profile) {
    return {
      allowed: false,
      code: "account_inactive",
      message: "Dieser Account ist derzeit deaktiviert.",
      organizationId: null,
      subscription: null,
      usedLegacyFallback: false,
      userId,
    };
  }

  if (!profile.is_active) {
    return {
      allowed: false,
      code: "account_inactive",
      message: "Dieser Account ist derzeit deaktiviert.",
      organizationId: null,
      subscription: null,
      usedLegacyFallback: false,
      userId,
    };
  }

  if (profile.role === "master_admin") {
    return {
      allowed: true,
      code: null,
      message: null,
      organizationId: null,
      subscription: null,
      usedLegacyFallback: false,
      userId,
    };
  }

  const { data: memberships, error: membershipsError } = await serviceRoleClient
    .from("organization_members")
    .select(
      "organization_id, role_in_org, created_at, organizations!inner(id, organization_name, is_active)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const organizationMemberships = (memberships ?? []) as MembershipRecord[];

  if (organizationMemberships.length > 0) {
    const organizationIds = organizationMemberships.map(
      (membership) => membership.organization_id
    );
    const latestSubscriptions = await getLatestCopeCartSubscriptionsForOrganizations(
      serviceRoleClient,
      organizationIds
    );
    const latestLegacySubscriptions =
      await getLatestLegacySubscriptionsForOrganizations(
        serviceRoleClient,
        organizationIds
      );

    for (const membership of organizationMemberships) {
      const membershipOrganization = getMembershipOrganization(membership);

      if (!membershipOrganization?.is_active) {
        continue;
      }

      if (allowAllSubscriptions) {
        // TODO: REMOVE AFTER SUBSCRIPTION DEBUGGING
        return {
          allowed: true,
          code: null,
          message: null,
          organizationId: membership.organization_id,
          subscription:
            latestSubscriptions.get(membership.organization_id) ?? null,
          usedLegacyFallback: false,
          userId,
        };
      }

      const subscription =
        latestSubscriptions.get(membership.organization_id) ?? null;

      if (subscription && isSubscriptionCurrentlyEntitled(subscription)) {
        return {
          allowed: true,
          code: null,
          message: null,
          organizationId: membership.organization_id,
          subscription,
          usedLegacyFallback: false,
          userId,
        };
      }

      const legacySubscription =
        latestLegacySubscriptions.get(membership.organization_id) ?? null;

      if (isLegacyManualSubscriptionEntitled(legacySubscription)) {
        return {
          allowed: true,
          code: null,
          message: null,
          organizationId: membership.organization_id,
          subscription,
          usedLegacyFallback: true,
          userId,
        };
      }

      if (isLegacyManualSubscriptionExpired(legacySubscription)) {
        return {
          allowed: false,
          code: "subscription_expired",
          message: "Der manuelle Organisationszugang ist abgelaufen.",
          organizationId: membership.organization_id,
          subscription,
          usedLegacyFallback: true,
          userId,
        };
      }

      if (
        subscription &&
        (subscription.subscription_status !== "pending" ||
          subscription.last_ipn_event_at)
      ) {
        if (subscription.current_period_paid_until) {
        return {
          allowed: false,
          code:
            subscription.subscription_status === "past_due" &&
            !isFutureIsoDate(subscription.grace_period_until)
              ? "subscription_inactive"
              : new Date(subscription.current_period_paid_until).getTime() < Date.now()
                ? "subscription_expired"
                : "subscription_inactive",
          message:
              subscription.subscription_status === "past_due" &&
              !isFutureIsoDate(subscription.grace_period_until)
                ? "Die Karenzfrist für deine fehlgeschlagene Zahlung ist abgelaufen."
                : new Date(subscription.current_period_paid_until).getTime() < Date.now()
                ? "Dein Abo ist abgelaufen."
                : "Dein Abo ist aktuell nicht aktiv.",
            organizationId: membership.organization_id,
            subscription,
            usedLegacyFallback: false,
            userId,
          };
        }

        return {
          allowed: false,
          code: "subscription_inactive",
          message: "Dein Abo ist aktuell nicht aktiv.",
          organizationId: membership.organization_id,
          subscription,
          usedLegacyFallback: false,
          userId,
        };
      }

    }

    const firstMembership = organizationMemberships[0];

    const firstMembershipOrganization = firstMembership
      ? getMembershipOrganization(firstMembership)
      : null;

    if (firstMembership && !firstMembershipOrganization?.is_active) {
      return {
        allowed: false,
        code: "organization_inactive",
        message: "Diese Organisation ist derzeit deaktiviert.",
        organizationId: firstMembership.organization_id,
        subscription: null,
        usedLegacyFallback: false,
        userId,
      };
    }

    return {
      // Ohne vorhandenes Subscription-Objekt erlauben wir vorerst den Zugang,
      // damit neue Registrierungen auch ohne direkten CopeCart-Kauf starten können.
      // Bestehende inaktive/abgelaufene Subscriptions werden weiterhin oben geblockt.
      allowed: true,
      code: null,
      message: null,
      organizationId: firstMembership?.organization_id ?? null,
      subscription:
        firstMembership
          ? latestSubscriptions.get(firstMembership.organization_id) ?? null
          : null,
      usedLegacyFallback: false,
      userId,
    };
  }

  const userSubscriptions = await getLatestCopeCartSubscriptionsForUsers(
    serviceRoleClient,
    [userId]
  );
  const userSubscription = userSubscriptions.get(userId) ?? null;

  if (allowAllSubscriptions) {
    // TODO: REMOVE AFTER SUBSCRIPTION DEBUGGING
    return {
      allowed: true,
      code: null,
      message: null,
      organizationId: null,
      subscription: userSubscription,
      usedLegacyFallback: false,
      userId,
    };
  }

  if (userSubscription && isSubscriptionCurrentlyEntitled(userSubscription)) {
    return {
      allowed: true,
      code: null,
      message: null,
      organizationId: null,
      subscription: userSubscription,
      usedLegacyFallback: false,
      userId,
    };
  }

  if (userSubscription) {
    return {
      allowed: false,
      code:
        userSubscription.current_period_paid_until &&
        new Date(userSubscription.current_period_paid_until).getTime() < Date.now()
          ? "subscription_expired"
          : "subscription_inactive",
      message:
        userSubscription.current_period_paid_until &&
        new Date(userSubscription.current_period_paid_until).getTime() < Date.now()
          ? "Dein Abo ist abgelaufen."
          : "Dein Abo ist aktuell nicht aktiv.",
      organizationId: null,
      subscription: userSubscription,
      usedLegacyFallback: false,
      userId,
    };
  }

  return {
    // Gleiches Verhalten für User ohne Organisationskontext:
    // fehlendes Abo ist nicht mehr automatisch ein Login-Blocker.
    allowed: true,
    code: null,
    message: null,
    organizationId: null,
    subscription: null,
    usedLegacyFallback: false,
    userId,
  };
}

export async function requirePaidAppUser(
  authorizationHeader: string | null
): Promise<AppAuthResult> {
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
      message: "Paid app auth could not initialize Supabase clients",
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

  const { data: profile, error: profileError } = await serviceRoleClient
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle<ProfileAccessRecord>();

  if (profileError) {
    await logSystemEvent({
      message: "Paid app auth profile lookup failed",
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

  if (profile?.is_active && profile.role === "master_admin") {
    return {
      serviceRoleClient,
      supabase,
      userId: user.id,
    };
  }

  const accessState = await resolveAppAccessStateForUser({
    serviceRoleClient,
    userId: user.id,
  });

  if (!accessState.allowed) {
    return {
      code: accessState.code,
      error: accessState.message,
      status: 403,
    };
  }

  return {
    serviceRoleClient,
    supabase,
    userId: user.id,
  };
}

export function normalizeCopeCartIpnEvent(params: {
  payload: Record<string, unknown>;
  rawBody: string;
}): NormalizedCopeCartIpnEvent {
  const { payload, rawBody } = params;
  const eventType =
    normalizeText(
      getStringValue(payload, [
        "event",
        "event_type",
        "eventType",
        "type",
        "status_event",
      ])
    ) ?? "unknown";
  const orderId = normalizeText(
    getStringValue(payload, ["order_id", "orderId", "transaction_id", "transactionId"])
  );
  const rawEventId = normalizeText(
    getStringValue(payload, [
      "event_id",
      "eventId",
      "id",
      "ipn_id",
      "ipnId",
      "webhook_id",
      "webhookId",
    ])
  );
  const eventAt =
    getDateValue(payload, [
      "event_at",
      "eventAt",
      "created_at",
      "createdAt",
      "timestamp",
      "time",
      "paid_at",
      "paidAt",
    ]) ?? new Date().toISOString();

  return {
    amount: normalizeText(
      getStringValue(payload, ["amount", "price", "payment_amount", "paymentAmount"])
    ),
    currentPeriodPaidUntil: getCurrentPeriodPaidUntil(payload, eventAt),
    customerEmail: normalizeEmail(
      getStringValue(payload, [
        "customer_email",
        "customerEmail",
        "email",
        "buyer_email",
        "buyerEmail",
      ])
    ),
    eventAt,
    eventKey: buildEventKey({
      eventAt,
      eventType,
      orderId,
      rawBody,
      rawEventId,
    }),
    eventType,
    orderId,
    paymentAt:
      getDateValue(payload, ["last_payment_at", "lastPaymentAt", "paid_at", "paidAt"]) ??
      eventAt,
    productId: normalizeText(
      getStringValue(payload, [
        "product_id",
        "productId",
        "product",
        "product_identifier",
      ])
    ),
    rawEventId,
    rawPayload: payload,
    status: normalizeStatusKeyword(
      getStringValue(payload, [
        "status",
        "payment_status",
        "paymentStatus",
        "subscription_status",
        "subscriptionStatus",
      ])
    ),
  };
}

async function insertCopeCartIpnEvent(
  serviceRoleClient: SupabaseServerClient,
  event: CopeCartIpnEventInsert
) {
  const { error } = await serviceRoleClient.from("copecart_ipn_events").insert({
    amount: event.amount,
    copecart_customer_email: event.copecart_customer_email,
    copecart_order_id: event.copecart_order_id,
    copecart_product_id: event.copecart_product_id,
    event_key: event.event_key,
    event_type: event.event_type,
    payload: event.payload,
    processed_at: event.processed_at ?? null,
    processing_status: event.processing_status ?? "received",
    raw_event_id: event.raw_event_id,
  });

  if (!error) {
    return { inserted: true };
  }

  if (error.code === "23505") {
    return { inserted: false };
  }

  throw new Error(error.message);
}

async function updateCopeCartIpnEventStatus(params: {
  eventKey: string;
  processingStatus: "failed" | "ignored" | "processed";
  serviceRoleClient: SupabaseServerClient;
}) {
  const { error } = await params.serviceRoleClient
    .from("copecart_ipn_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_status: params.processingStatus,
    })
    .eq("event_key", params.eventKey);

  if (error) {
    throw new Error(error.message);
  }
}

async function syncOrganizationSeatLimitFromProduct(params: {
  copecartProductId: string | null;
  organizationId: string | null;
  serviceRoleClient: SupabaseServerClient;
  source: "ipn" | "signup_metadata";
}) {
  if (!params.organizationId || !params.copecartProductId) {
    return {
      changed: false,
      seatLimit: null,
      status: "skipped",
    } as const;
  }

  const mappedSeatLimit = getSeatLimitForCopeCartProduct(params.copecartProductId);

  if (!mappedSeatLimit) {
    if (params.source === "ipn") {
      await logSystemEvent({
        message: "Unknown CopeCart product ID received for seat limit mapping",
        metadata: {
          organizationId: params.organizationId,
          packageLabel: getPackageLabel({
            copecartProductId: params.copecartProductId,
          }),
          productId: params.copecartProductId,
        },
        organizationId: params.organizationId,
        severity: "warning",
        source: "copecart_ipn",
      });
    }

    return {
      changed: false,
      seatLimit: null,
      status: "unknown_product",
    } as const;
  }

  const { data: organization, error: organizationError } = await params.serviceRoleClient
    .from("organizations")
    .select("id, seat_limit")
    .eq("id", params.organizationId)
    .maybeSingle<{ id: string; seat_limit: number }>();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  if (!organization) {
    return {
      changed: false,
      seatLimit: mappedSeatLimit,
      status: "organization_missing",
    } as const;
  }

  const resolvedSeatLimit = resolveOrganizationSeatLimit({
    seatLimit: organization.seat_limit,
  }).seatLimit;

  if (resolvedSeatLimit === mappedSeatLimit) {
    return {
      changed: false,
      seatLimit: mappedSeatLimit,
      status: "unchanged",
    } as const;
  }

  const { error: updateError } = await params.serviceRoleClient
    .from("organizations")
    .update({ seat_limit: mappedSeatLimit })
    .eq("id", params.organizationId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    changed: true,
    seatLimit: mappedSeatLimit,
    status: "updated",
  } as const;
}

async function findSubscriptionOwnerContact(params: {
  serviceRoleClient: SupabaseServerClient;
  subscription: CopeCartSubscriptionRecord;
}) {
  let ownerUserId = params.subscription.user_id;

  if (params.subscription.organization_id) {
    const { data: ownerMembership, error: ownerMembershipError } =
      await params.serviceRoleClient
        .from("organization_members")
        .select("user_id, role_in_org, created_at")
        .eq("organization_id", params.subscription.organization_id)
        .eq("role_in_org", "admin")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle<{ created_at: string; role_in_org: string; user_id: string }>();

    if (ownerMembershipError) {
      throw new Error(ownerMembershipError.message);
    }

    ownerUserId = ownerMembership?.user_id ?? ownerUserId;
  }

  if (!ownerUserId) {
    return null;
  }

  const [authUserResult, profileResult] = await Promise.all([
    params.serviceRoleClient.auth.admin.getUserById(ownerUserId),
    params.serviceRoleClient
      .from("profiles")
      .select("first_name")
      .eq("id", ownerUserId)
      .maybeSingle<{ first_name: string | null }>(),
  ]);

  if (authUserResult.error) {
    throw new Error(authUserResult.error.message);
  }

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  const email = normalizeEmail(authUserResult.data.user.email);

  if (!email) {
    return null;
  }

  return {
    email,
    firstName: normalizeText(profileResult.data?.first_name),
    userId: ownerUserId,
  } satisfies SubscriptionOwnerContact;
}

async function maybeSendPaymentFailureWarning(params: {
  serviceRoleClient: SupabaseServerClient;
  subscription: CopeCartSubscriptionRecord;
}) {
  if (
    params.subscription.payment_failure_email_sent_at &&
    params.subscription.subscription_status === "past_due" &&
    isFutureIsoDate(params.subscription.grace_period_until)
  ) {
    return {
      sentAt: params.subscription.payment_failure_email_sent_at,
      skipped: true as const,
      reason: "already_sent_for_active_grace",
    };
  }

  const owner = await findSubscriptionOwnerContact(params);

  if (!owner) {
    await logSystemEvent({
      message: "CopeCart payment failure warning skipped because owner email is missing",
      metadata: {
        organizationId: params.subscription.organization_id,
        subscriptionId: params.subscription.id,
        userId: params.subscription.user_id,
      },
      organizationId: params.subscription.organization_id,
      severity: "warning",
      source: "copecart_ipn",
    });

    return {
      sentAt: null,
      skipped: true as const,
      reason: "owner_missing",
    };
  }

  const sendResult = await sendCopeCartPaymentFailedWarningEmail({
    firstName: owner.firstName,
    recipientEmail: owner.email,
  });

  if (sendResult.mode !== "sent") {
    await logSystemEvent({
      message: "CopeCart payment failure warning email could not be sent",
      metadata: {
        organizationId: params.subscription.organization_id,
        ownerUserId: owner.userId,
        reason: sendResult.reason,
        subscriptionId: params.subscription.id,
      },
      organizationId: params.subscription.organization_id,
      severity: "error",
      source: "copecart_ipn",
    });

    return {
      sentAt: null,
      skipped: true as const,
      reason: sendResult.reason,
    };
  }

  const sentAt = new Date().toISOString();
  const { error } = await params.serviceRoleClient
    .from("copecart_subscriptions")
    .update({
      payment_failure_email_sent_at: sentAt,
    })
    .eq("id", params.subscription.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    sentAt,
    skipped: false as const,
    reason: null,
  };
}

async function findTargetUserBySignupMetadata(params: {
  customerEmail: string | null;
  orderId: string | null;
  serviceRoleClient: SupabaseServerClient;
}) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await params.serviceRoleClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(error.message);
    }

    const matchingUser = (data.users as AuthUserSummary[]).find((user) => {
      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metadataOrderId = normalizeText(
        typeof metadata.cope_cart_order_id === "string"
          ? metadata.cope_cart_order_id
          : null
      );
      const metadataCustomerEmail = normalizeEmail(
        typeof metadata.cope_cart_customer_email === "string"
          ? metadata.cope_cart_customer_email
          : user.email
      );

      if (params.orderId && metadataOrderId === params.orderId) {
        return true;
      }

      return Boolean(
        params.customerEmail && metadataCustomerEmail === params.customerEmail
      );
    });

    if (matchingUser) {
      return matchingUser;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

export async function upsertPendingCopeCartSubscriptionFromSignupMetadata(params: {
  customerEmail?: string | null;
  orderId?: string | null;
  productId?: string | null;
  serviceRoleClient: SupabaseServerClient;
  userId: string;
}) {
  const orderId = normalizeText(params.orderId);
  const customerEmail = normalizeEmail(params.customerEmail);

  if (!orderId && !customerEmail) {
    return null;
  }

  let profileExists = false;
  let membership: { organization_id: string; role_in_org: string } | null = null;

  // Signup creates auth user first; profile/membership can appear a moment later via trigger.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [{ data: profile }, { data: resolvedMembership }] = await Promise.all([
      params.serviceRoleClient
        .from("profiles")
        .select("id")
        .eq("id", params.userId)
        .maybeSingle<{ id: string }>(),
      params.serviceRoleClient
        .from("organization_members")
        .select("organization_id, role_in_org")
        .eq("user_id", params.userId)
        .eq("role_in_org", "admin")
        .limit(1)
        .maybeSingle<{ organization_id: string; role_in_org: string }>(),
    ]);

    profileExists = Boolean(profile);
    membership = resolvedMembership ?? null;

    if (profileExists || membership) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const resolvedUserId = profileExists ? params.userId : null;
  const resolvedOrganizationId = membership?.organization_id ?? null;

  if (!resolvedUserId && !resolvedOrganizationId) {
    console.warn(
      "[copecart-subscriptions] skipping pending subscription upsert during signup because profile/membership is not available yet",
      { orderId, customerEmail, userId: params.userId }
    );
    return null;
  }

  const payload = {
    copecart_customer_email: customerEmail,
    copecart_order_id: orderId,
    copecart_product_id: normalizeText(params.productId),
    organization_id: resolvedOrganizationId,
    subscription_status: "pending" as CopeCartSubscriptionStatus,
    user_id: resolvedUserId,
  };

  if (orderId) {
    const { data: existingSubscription, error: existingSubscriptionError } =
      await params.serviceRoleClient
        .from("copecart_subscriptions")
        .select("id, organization_id, user_id")
        .eq("copecart_order_id", orderId)
        .limit(1)
        .maybeSingle<{
          id: string;
          organization_id: string | null;
          user_id: string | null;
        }>();

    if (existingSubscriptionError) {
      throw new Error(existingSubscriptionError.message);
    }

    if (existingSubscription) {
      const { error: updateError } = await params.serviceRoleClient
        .from("copecart_subscriptions")
        .update({
          copecart_customer_email:
            customerEmail ?? payload.copecart_customer_email,
          copecart_product_id: payload.copecart_product_id,
          organization_id:
            existingSubscription.organization_id ?? payload.organization_id,
          user_id: existingSubscription.user_id ?? payload.user_id,
        })
        .eq("id", existingSubscription.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await syncOrganizationSeatLimitFromProduct({
        copecartProductId: payload.copecart_product_id,
        organizationId:
          existingSubscription.organization_id ?? payload.organization_id,
        serviceRoleClient: params.serviceRoleClient,
        source: "signup_metadata",
      });

      return true;
    }

    const { error } = await params.serviceRoleClient
      .from("copecart_subscriptions")
      .insert(payload);

    if (error) {
      if (error.code === "23505") {
        return upsertPendingCopeCartSubscriptionFromSignupMetadata(params);
      }

      throw new Error(error.message);
    }

    await syncOrganizationSeatLimitFromProduct({
      copecartProductId: payload.copecart_product_id,
      organizationId: payload.organization_id,
      serviceRoleClient: params.serviceRoleClient,
      source: "signup_metadata",
    });

    return true;
  }

  const { error } = await params.serviceRoleClient.from("copecart_subscriptions").insert(payload);

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  await syncOrganizationSeatLimitFromProduct({
    copecartProductId: payload.copecart_product_id,
    organizationId: payload.organization_id,
    serviceRoleClient: params.serviceRoleClient,
    source: "signup_metadata",
  });

  return true;
}

async function resolveOrCreateCopeCartSubscriptionTarget(params: {
  customerEmail: string | null;
  orderId: string | null;
  productId: string | null;
  serviceRoleClient: SupabaseServerClient;
}) {
  if (params.orderId) {
    const { data: existingByOrder, error } = await params.serviceRoleClient
      .from("copecart_subscriptions")
      .select(
        "id, user_id, organization_id, copecart_order_id, copecart_product_id, copecart_customer_email, subscription_status, last_payment_at, current_period_paid_until, grace_period_until, payment_failed_at, payment_failure_email_sent_at, last_ipn_event_at, created_at, updated_at"
      )
      .eq("copecart_order_id", params.orderId)
      .maybeSingle<CopeCartSubscriptionRecord>();

    if (error) {
      throw new Error(error.message);
    }

    if (existingByOrder) {
      return existingByOrder;
    }
  }

  if (params.customerEmail) {
    const { data: existingByEmail, error } = await params.serviceRoleClient
      .from("copecart_subscriptions")
      .select(
        "id, user_id, organization_id, copecart_order_id, copecart_product_id, copecart_customer_email, subscription_status, last_payment_at, current_period_paid_until, grace_period_until, payment_failed_at, payment_failure_email_sent_at, last_ipn_event_at, created_at, updated_at"
      )
      .eq("copecart_customer_email", params.customerEmail)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<CopeCartSubscriptionRecord>();

    if (error) {
      throw new Error(error.message);
    }

    if (existingByEmail) {
      return existingByEmail;
    }
  }

  const matchingUser = await findTargetUserBySignupMetadata({
    customerEmail: params.customerEmail,
    orderId: params.orderId,
    serviceRoleClient: params.serviceRoleClient,
  });

  if (!matchingUser) {
    return null;
  }

  await upsertPendingCopeCartSubscriptionFromSignupMetadata({
    customerEmail: params.customerEmail ?? matchingUser.email,
    orderId: params.orderId,
    productId: params.productId,
    serviceRoleClient: params.serviceRoleClient,
    userId: matchingUser.id,
  });

  if (!params.orderId && !params.customerEmail) {
    return null;
  }

  const filterColumn = params.orderId ? "copecart_order_id" : "copecart_customer_email";
  const filterValue = params.orderId ?? params.customerEmail;

  const { data, error } = await params.serviceRoleClient
    .from("copecart_subscriptions")
    .select(
      "id, user_id, organization_id, copecart_order_id, copecart_product_id, copecart_customer_email, subscription_status, last_payment_at, current_period_paid_until, grace_period_until, payment_failed_at, payment_failure_email_sent_at, last_ipn_event_at, created_at, updated_at"
    )
    .eq(filterColumn, filterValue)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<CopeCartSubscriptionRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function processCopeCartIpn(params: {
  event: NormalizedCopeCartIpnEvent;
  serviceRoleClient: SupabaseServerClient;
}): Promise<ProcessCopeCartIpnResult> {
  const { event, serviceRoleClient } = params;
  const insertResult = await insertCopeCartIpnEvent(serviceRoleClient, {
    amount: event.amount,
    copecart_customer_email: event.customerEmail,
    copecart_order_id: event.orderId,
    copecart_product_id: event.productId,
    event_key: event.eventKey,
    event_type: event.eventType,
    payload: event.rawPayload,
    raw_event_id: event.rawEventId,
  });

  if (!insertResult.inserted) {
    return {
      duplicate: true,
      eventType: event.eventType,
      message: "IPN event already processed.",
      orderId: event.orderId,
      processed: false,
      subscriptionStatus: null,
      targetOrganizationId: null,
      targetUserId: null,
    };
  }

  const mappedEvent = mapIpnEventToSubscriptionStatus(event);

  if (!mappedEvent.shouldUpdateAccess || !mappedEvent.status) {
    await updateCopeCartIpnEventStatus({
      eventKey: event.eventKey,
      processingStatus: "ignored",
      serviceRoleClient,
    });

    return {
      duplicate: false,
      eventType: event.eventType,
      message: "Unknown CopeCart event stored without access change.",
      orderId: event.orderId,
      processed: true,
      subscriptionStatus: null,
      targetOrganizationId: null,
      targetUserId: null,
    };
  }

  const targetSubscription = await resolveOrCreateCopeCartSubscriptionTarget({
    customerEmail: event.customerEmail,
    orderId: event.orderId,
    productId: event.productId,
    serviceRoleClient,
  });

  if (!targetSubscription) {
    await updateCopeCartIpnEventStatus({
      eventKey: event.eventKey,
      processingStatus: "ignored",
      serviceRoleClient,
    });

    await logSystemEvent({
      message: "CopeCart IPN could not resolve a subscription target",
      metadata: {
        customerEmail: event.customerEmail,
        eventKey: event.eventKey,
        eventType: event.eventType,
        orderId: event.orderId,
        productId: event.productId,
      },
      severity: "warning",
      source: "copecart_ipn",
    });

    return {
      duplicate: false,
      eventType: event.eventType,
      message: "No matching user or organization found for CopeCart IPN.",
      orderId: event.orderId,
      processed: true,
      subscriptionStatus: null,
      targetOrganizationId: null,
      targetUserId: null,
    };
  }

  const nextPaidUntil =
    mappedEvent.status === "active"
      ? event.currentPeriodPaidUntil
      : mappedEvent.allowAccessUntilPeriodEnd
        ? event.currentPeriodPaidUntil ?? targetSubscription.current_period_paid_until
        : targetSubscription.current_period_paid_until;
  const processedAtIso = new Date().toISOString();
  const paymentFailedAt =
    mappedEvent.status === "past_due" ? processedAtIso : null;
  const gracePeriodUntil =
    mappedEvent.status === "past_due"
      ? getGracePeriodUntilIso(new Date(processedAtIso))
      : null;
  const shouldResetFailureState = mappedEvent.status === "active";
  const shouldRetainFailureEmailTimestamp =
    mappedEvent.status === "past_due" &&
    targetSubscription.subscription_status === "past_due" &&
    isFutureIsoDate(targetSubscription.grace_period_until) &&
    Boolean(targetSubscription.payment_failure_email_sent_at);

  const { error: updateError } = await serviceRoleClient
    .from("copecart_subscriptions")
    .update({
      copecart_customer_email:
        event.customerEmail ?? targetSubscription.copecart_customer_email,
      copecart_order_id: event.orderId ?? targetSubscription.copecart_order_id,
      copecart_product_id: event.productId ?? targetSubscription.copecart_product_id,
      current_period_paid_until: nextPaidUntil,
      grace_period_until:
        mappedEvent.status === "past_due"
          ? gracePeriodUntil
          : shouldResetFailureState
            ? null
            : targetSubscription.grace_period_until,
      last_event_key: event.eventKey,
      last_ipn_event_at: processedAtIso,
      last_payment_at:
        mappedEvent.status === "active"
          ? event.paymentAt ?? event.eventAt
          : targetSubscription.last_payment_at,
      payment_failed_at:
        mappedEvent.status === "past_due"
          ? paymentFailedAt
          : shouldResetFailureState
            ? null
            : targetSubscription.payment_failed_at,
      payment_failure_email_sent_at:
        mappedEvent.status === "past_due"
          ? shouldRetainFailureEmailTimestamp
            ? targetSubscription.payment_failure_email_sent_at
            : null
          : shouldResetFailureState
            ? null
            : targetSubscription.payment_failure_email_sent_at,
      subscription_status: mappedEvent.status,
    })
    .eq("id", targetSubscription.id);

  if (updateError) {
    await updateCopeCartIpnEventStatus({
      eventKey: event.eventKey,
      processingStatus: "failed",
      serviceRoleClient,
    });

    throw new Error(updateError.message);
  }

  if (mappedEvent.status === "active") {
    await syncOrganizationSeatLimitFromProduct({
      copecartProductId: event.productId ?? targetSubscription.copecart_product_id,
      organizationId: targetSubscription.organization_id,
      serviceRoleClient,
      source: "ipn",
    });
  }

  if (mappedEvent.status === "past_due") {
    const refreshedSubscription: CopeCartSubscriptionRecord = {
      ...targetSubscription,
      copecart_customer_email:
        event.customerEmail ?? targetSubscription.copecart_customer_email,
      copecart_order_id: event.orderId ?? targetSubscription.copecart_order_id,
      copecart_product_id: event.productId ?? targetSubscription.copecart_product_id,
      current_period_paid_until: nextPaidUntil,
      grace_period_until: gracePeriodUntil,
      last_ipn_event_at: processedAtIso,
      payment_failed_at: paymentFailedAt,
      payment_failure_email_sent_at:
        shouldRetainFailureEmailTimestamp
          ? targetSubscription.payment_failure_email_sent_at
          : null,
      subscription_status: "past_due",
    };

    await maybeSendPaymentFailureWarning({
      serviceRoleClient,
      subscription: refreshedSubscription,
    });
  }

  await updateCopeCartIpnEventStatus({
    eventKey: event.eventKey,
    processingStatus: "processed",
    serviceRoleClient,
  });

  return {
    duplicate: false,
    eventType: event.eventType,
    message: "CopeCart IPN processed successfully.",
    orderId: event.orderId,
    processed: true,
    subscriptionStatus: mappedEvent.status,
    targetOrganizationId: targetSubscription.organization_id,
    targetUserId: targetSubscription.user_id,
  };
}

export async function expireStaleCopeCartSubscriptions(
  serviceRoleClient: SupabaseServerClient
) {
  const nowIso = new Date().toISOString();
  if (isAllowAllSubscriptionsEnabled()) {
    // TODO: REMOVE AFTER SUBSCRIPTION DEBUGGING
    return {
      expiredCount: 0,
      manualExpiredCount: 0,
      paymentFailedCount: 0,
      checkedAt: nowIso,
      skippedBecauseEmergencyBypass: true,
    };
  }

  const { data: expiredSubscriptions, error: expiredSubscriptionsError } =
    await serviceRoleClient
      .from("copecart_subscriptions")
      .update({ subscription_status: "expired" })
      .in("subscription_status", ["active", "cancelled"])
      .lt("current_period_paid_until", nowIso)
      .select("id");

  if (expiredSubscriptionsError) {
    throw new Error(expiredSubscriptionsError.message);
  }

  const { data: paymentFailedSubscriptions, error: paymentFailedError } =
    await serviceRoleClient
      .from("copecart_subscriptions")
      .update({ subscription_status: "payment_failed" })
      .eq("subscription_status", "past_due")
      .not("grace_period_until", "is", null)
      .lte("grace_period_until", nowIso)
      .select("id");

  if (paymentFailedError) {
    throw new Error(paymentFailedError.message);
  }

  const { data: expiredManualSubscriptions, error: manualExpiredError } =
    await serviceRoleClient
      .from("subscriptions")
      .update({ status: "manual_expired" })
      .eq("plan_key", "manual")
      .eq("status", "manual_active")
      .not("current_period_end", "is", null)
      .lte("current_period_end", nowIso)
      .select("id");

  if (manualExpiredError) {
    throw new Error(manualExpiredError.message);
  }

  return {
    expiredCount: (expiredSubscriptions ?? []).length,
    manualExpiredCount: (expiredManualSubscriptions ?? []).length,
    paymentFailedCount: (paymentFailedSubscriptions ?? []).length,
    checkedAt: nowIso,
  };
}
