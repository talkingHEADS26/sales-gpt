import crypto from "node:crypto";

import type { FranchiseVerticalKey, IndustryKey } from "@/lib/industries";
import { normalizeIndustryKey } from "@/lib/industries";
import { sendInviteEmail } from "@/lib/invite-mailer";
import type { SupabaseServerClient } from "@/lib/supabase-server";

type ManualOrganizationOwnerInput = {
  email: string;
  firstName: string;
  lastName: string;
};

type CreateManualOrganizationParams = {
  franchiseVertical: FranchiseVerticalKey | null;
  industryKey: IndustryKey;
  organizationName: string;
  owner: ManualOrganizationOwnerInput;
  seatLimit: number;
  serviceRoleClient: SupabaseServerClient;
  usageDurationDays: number;
};

type ManualOrganizationInsertPayload = {
  franchise_vertical?: FranchiseVerticalKey | null;
  industry_key: IndustryKey | string;
  is_active: boolean;
  organization_name: string;
  seat_limit: number;
};

type ManualOrganizationRow = {
  franchise_vertical: string | null;
  id: string;
  industry_key: string | null;
  organization_name: string;
  seat_limit: number;
};

function normalizeText(value: string) {
  return value.trim();
}

function toLegacyIndustryKey(industryKey: IndustryKey) {
  if (industryKey === "franchise") {
    return "automotive";
  }
  if (industryKey === "finance") {
    return "insurance";
  }
  if (industryKey === "fitness") {
    return "physio";
  }
  return industryKey;
}

async function createOrganizationAndSubscription(params: {
  franchiseVertical: FranchiseVerticalKey | null;
  industryKey: IndustryKey;
  organizationName: string;
  seatLimit: number;
  serviceRoleClient: SupabaseServerClient;
  usageDurationDays: number;
}) {
  const validUntil = new Date(
    Date.now() + params.usageDurationDays * 24 * 60 * 60 * 1000
  );
  const organizationPayload = {
    franchise_vertical:
      params.industryKey === "franchise" ? params.franchiseVertical : null,
    industry_key: params.industryKey,
    is_active: true,
    organization_name: params.organizationName,
    seat_limit: params.seatLimit,
  };
  let hasFranchiseVerticalColumn = true;
  let payloadUsedForLastInsert: ManualOrganizationInsertPayload = {
    ...organizationPayload,
  };

  let { data: organization, error: organizationError } = await params.serviceRoleClient
    .from("organizations")
    .insert(payloadUsedForLastInsert)
    .select("id, organization_name, seat_limit, industry_key, franchise_vertical")
    .single<ManualOrganizationRow>();

  if (organizationError?.message?.includes("franchise_vertical")) {
    hasFranchiseVerticalColumn = false;
    const fallbackPayload: ManualOrganizationInsertPayload = {
      ...organizationPayload,
    };
    delete fallbackPayload.franchise_vertical;
    payloadUsedForLastInsert = fallbackPayload;
    const fallbackResult = await params.serviceRoleClient
      .from("organizations")
      .insert(payloadUsedForLastInsert)
      .select("id, organization_name, seat_limit, industry_key")
      .single<{
        id: string;
        industry_key: string | null;
        organization_name: string;
        seat_limit: number;
      }>();

    organizationError = fallbackResult.error;
    organization = fallbackResult.data
      ? {
          ...fallbackResult.data,
          franchise_vertical: null,
        }
      : null;
  }

  if (organizationError?.message?.includes("organizations_industry_key_check")) {
    const legacyPayload = {
      ...payloadUsedForLastInsert,
      industry_key: toLegacyIndustryKey(params.industryKey),
    };

    if (hasFranchiseVerticalColumn) {
      const legacyResult = await params.serviceRoleClient
        .from("organizations")
        .insert(legacyPayload)
        .select("id, organization_name, seat_limit, industry_key, franchise_vertical")
        .single<ManualOrganizationRow>();

      organizationError = legacyResult.error;
      organization = legacyResult.data;
    } else {
      const legacyResult = await params.serviceRoleClient
        .from("organizations")
        .insert(legacyPayload)
        .select("id, organization_name, seat_limit, industry_key")
        .single<{
          id: string;
          industry_key: string | null;
          organization_name: string;
          seat_limit: number;
        }>();

      organizationError = legacyResult.error;
      organization = legacyResult.data
        ? {
            ...legacyResult.data,
            franchise_vertical: null,
          }
        : null;
    }
  }

  if (organizationError || !organization) {
    throw new Error(
      organizationError?.message ?? "Organisation konnte nicht erstellt werden."
    );
  }

  const { error: subscriptionError } = await params.serviceRoleClient
    .from("subscriptions")
    .insert({
      current_period_end: validUntil.toISOString(),
      organization_id: organization.id,
      plan_key: "manual",
      status: "manual_active",
    });

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  return {
    ...organization,
    validUntil: validUntil.toISOString(),
  };
}

async function createOwnerInvitation(params: {
  email: string;
  organizationId: string;
  serviceRoleClient: SupabaseServerClient;
}) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const { data: invitation, error: invitationError } = await params.serviceRoleClient
    .from("invitations")
    .insert({
      email: params.email,
      expires_at: expiresAt,
      organization_id: params.organizationId,
      role_to_assign: "admin",
      token,
    })
    .select("id, token")
    .single<{ id: string; token: string }>();

  if (invitationError || !invitation) {
    throw new Error(
      invitationError?.message ?? "Owner-Einladung konnte nicht erstellt werden."
    );
  }

  return {
    expiresAt,
    inviteId: invitation.id,
    token: invitation.token,
  };
}

export async function createManualOrganizationWithOwner({
  franchiseVertical,
  industryKey,
  organizationName,
  owner,
  seatLimit,
  serviceRoleClient,
  usageDurationDays,
}: CreateManualOrganizationParams) {
  const normalizedOrganizationName = normalizeText(organizationName);
  const normalizedIndustryKey = normalizeIndustryKey(industryKey);
  const normalizedOwner = {
    email: owner.email.trim().toLowerCase(),
    firstName: owner.firstName.trim(),
    lastName: owner.lastName.trim(),
  };
  const organization = await createOrganizationAndSubscription({
    franchiseVertical,
    industryKey: normalizedIndustryKey,
    organizationName: normalizedOrganizationName,
    seatLimit,
    serviceRoleClient,
    usageDurationDays,
  });

  try {
    const ownerInvitation = await createOwnerInvitation({
      email: normalizedOwner.email,
      organizationId: organization.id,
      serviceRoleClient,
    });

    const emailResult = await sendInviteEmail({
      inviteToken: ownerInvitation.token,
      organizationName: organization.organization_name,
      recipientName: normalizedOwner.firstName,
      recipientEmail: normalizedOwner.email,
    });

    if (emailResult.mode !== "sent") {
      throw new Error(
        emailResult.reason === "not_configured"
          ? "Die Einladungs-E-Mail ist nicht vollständig konfiguriert."
          : "Die Einladungs-E-Mail konnte nicht gesendet werden."
      );
    }

    return {
      organization: {
        id: organization.id,
        franchiseVertical:
          normalizeIndustryKey(organization.industry_key) === "franchise"
            ? organization.franchise_vertical
            : null,
        industryKey: normalizeIndustryKey(organization.industry_key),
        name: organization.organization_name,
        seatLimit: organization.seat_limit,
        usageDurationDays,
        validUntil: organization.validUntil,
      },
      owner: {
        created: false,
        email: normalizedOwner.email,
        inviteId: ownerInvitation.inviteId,
      },
    };
  } catch (error) {
    await serviceRoleClient
      .from("organizations")
      .delete()
      .eq("id", organization.id);

    throw error;
  }
}
