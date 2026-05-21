import crypto from "node:crypto";

import { sendManualOrganizationActivationEmail } from "@/lib/email/send-manual-organization-activation";
import { getPasswordResetRedirectUrl } from "@/lib/site-url";
import type { SupabaseServerClient } from "@/lib/supabase-server";

type ManualOrganizationOwnerInput = {
  email: string;
  firstName: string;
  lastName: string;
};

type CreateManualOrganizationParams = {
  organizationName: string;
  owner: ManualOrganizationOwnerInput;
  seatLimit: number;
  serviceRoleClient: SupabaseServerClient;
  usageDurationDays: number;
};

type ExistingAuthUser = {
  email: string | null;
  email_confirmed_at?: string | null;
  id: string;
};

type ProfileRow = {
  first_name: string | null;
  full_name: string | null;
  id: string;
  is_active: boolean;
  last_name: string | null;
  role: string | null;
};

function normalizeText(value: string) {
  return value.trim();
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

function composeFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || null;
}

async function lookupAuthUserByEmail(params: {
  email: string;
  serviceRoleClient: SupabaseServerClient;
}) {
  let page = 1;
  const perPage = 200;
  const normalizedEmail = normalizeEmail(params.email);

  while (true) {
    const { data, error } = await params.serviceRoleClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(error.message);
    }

    const user = (data.users as ExistingAuthUser[]).find(
      (candidate) => normalizeEmail(candidate.email ?? "") === normalizedEmail
    );

    if (user) {
      return user;
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

async function ensureProfileRecord(params: {
  firstName: string;
  lastName: string;
  serviceRoleClient: SupabaseServerClient;
  userId: string;
}) {
  const fullName = composeFullName(params.firstName, params.lastName);
  const { data: profile, error: profileError } = await params.serviceRoleClient
    .from("profiles")
    .select("id, first_name, last_name, full_name, role, is_active")
    .eq("id", params.userId)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    const { error: insertError } = await params.serviceRoleClient.from("profiles").insert({
      id: params.userId,
      first_name: params.firstName,
      full_name: fullName,
      is_active: true,
      last_name: params.lastName,
      role: "user",
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return;
  }

  if (!profile.is_active) {
    throw new Error(
      "Der vorhandene Inhaber-Account ist derzeit deaktiviert und kann nicht automatisch zugeordnet werden."
    );
  }

  const nextFirstName = profile.first_name?.trim() || params.firstName;
  const nextLastName = profile.last_name?.trim() || params.lastName;
  const nextFullName = profile.full_name?.trim() || composeFullName(nextFirstName, nextLastName);
  const nextIsActive = profile.is_active;
  const nextRole = profile.role === "master_admin" ? profile.role : profile.role ?? "user";

  const shouldUpdate =
    profile.first_name !== nextFirstName ||
    profile.last_name !== nextLastName ||
    profile.full_name !== nextFullName ||
    profile.is_active !== nextIsActive ||
    profile.role !== nextRole;

  if (!shouldUpdate) {
    return;
  }

  const { error: updateError } = await params.serviceRoleClient
    .from("profiles")
    .update({
      first_name: nextFirstName,
      full_name: nextFullName,
      is_active: nextIsActive,
      last_name: nextLastName,
      role: nextRole,
    })
    .eq("id", params.userId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function createOrganizationAndSubscription(params: {
  organizationName: string;
  seatLimit: number;
  serviceRoleClient: SupabaseServerClient;
  usageDurationDays: number;
}) {
  const validUntil = new Date(
    Date.now() + params.usageDurationDays * 24 * 60 * 60 * 1000
  );

  const { data: organization, error: organizationError } = await params.serviceRoleClient
    .from("organizations")
    .insert({
      is_active: true,
      organization_name: params.organizationName,
      seat_limit: params.seatLimit,
    })
    .select("id, organization_name, seat_limit")
    .single<{ id: string; organization_name: string; seat_limit: number }>();

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

async function ensureOrganizationMembership(params: {
  organizationId: string;
  serviceRoleClient: SupabaseServerClient;
  userId: string;
}) {
  const { data: membership, error: membershipError } = await params.serviceRoleClient
    .from("organization_members")
    .select("id, role_in_org")
    .eq("organization_id", params.organizationId)
    .eq("user_id", params.userId)
    .maybeSingle<{ id: string; role_in_org: string }>();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    const { error: insertError } = await params.serviceRoleClient
      .from("organization_members")
      .insert({
        organization_id: params.organizationId,
        role_in_org: "admin",
        user_id: params.userId,
      });

    if (insertError) {
      throw new Error(insertError.message);
    }

    return;
  }

  if (membership.role_in_org !== "admin") {
    const { error: updateError } = await params.serviceRoleClient
      .from("organization_members")
      .update({ role_in_org: "admin" })
      .eq("id", membership.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

async function createOrResolveOwnerUser(params: {
  owner: ManualOrganizationOwnerInput;
  serviceRoleClient: SupabaseServerClient;
}) {
  const existingUser = await lookupAuthUserByEmail({
    email: params.owner.email,
    serviceRoleClient: params.serviceRoleClient,
  });

  if (existingUser) {
    await ensureProfileRecord({
      firstName: params.owner.firstName,
      lastName: params.owner.lastName,
      serviceRoleClient: params.serviceRoleClient,
      userId: existingUser.id,
    });

    return {
      created: false,
      email: normalizeEmail(params.owner.email),
      firstName: params.owner.firstName,
      userId: existingUser.id,
    };
  }

  const randomPassword = crypto.randomBytes(24).toString("hex");
  const createUserResult = await params.serviceRoleClient.auth.admin.createUser({
    email: normalizeEmail(params.owner.email),
    email_confirm: true,
    password: randomPassword,
    user_metadata: {
      first_name: params.owner.firstName,
      last_name: params.owner.lastName,
      registration_mode: "basic",
    },
  });

  if (createUserResult.error || !createUserResult.data.user) {
    throw new Error(
      createUserResult.error?.message ?? "Owner-User konnte nicht erstellt werden."
    );
  }

  await ensureProfileRecord({
    firstName: params.owner.firstName,
    lastName: params.owner.lastName,
    serviceRoleClient: params.serviceRoleClient,
    userId: createUserResult.data.user.id,
  });

  return {
    created: true,
    email: normalizeEmail(params.owner.email),
    firstName: params.owner.firstName,
    userId: createUserResult.data.user.id,
  };
}

async function generateActivationLink(params: {
  email: string;
  serviceRoleClient: SupabaseServerClient;
}) {
  const generateLinkResult = await params.serviceRoleClient.auth.admin.generateLink({
    type: "recovery",
    email: params.email,
    options: {
      redirectTo: getPasswordResetRedirectUrl(),
    },
  });

  if (generateLinkResult.error || !generateLinkResult.data.properties?.action_link) {
    throw new Error(
      generateLinkResult.error?.message ??
        "Aktivierungslink konnte nicht erstellt werden."
    );
  }

  return generateLinkResult.data.properties.action_link;
}

export async function createManualOrganizationWithOwner({
  organizationName,
  owner,
  seatLimit,
  serviceRoleClient,
  usageDurationDays,
}: CreateManualOrganizationParams) {
  const normalizedOrganizationName = normalizeText(organizationName);
  const normalizedOwner = {
    email: normalizeEmail(owner.email),
    firstName: normalizeText(owner.firstName),
    lastName: normalizeText(owner.lastName),
  };

  const resolvedOwner = await createOrResolveOwnerUser({
    owner: normalizedOwner,
    serviceRoleClient,
  });
  const organization = await createOrganizationAndSubscription({
    organizationName: normalizedOrganizationName,
    seatLimit,
    serviceRoleClient,
    usageDurationDays,
  });

  try {
    await ensureOrganizationMembership({
      organizationId: organization.id,
      serviceRoleClient,
      userId: resolvedOwner.userId,
    });

    const activationUrl = await generateActivationLink({
      email: resolvedOwner.email,
      serviceRoleClient,
    });
    const emailResult = await sendManualOrganizationActivationEmail({
      activationUrl,
      firstName: normalizedOwner.firstName,
      recipientEmail: resolvedOwner.email,
      usageDurationDays,
      validUntil: organization.validUntil,
    });

    if (emailResult.mode !== "sent") {
      throw new Error(
        emailResult.reason === "not_configured"
          ? "Die Aktivierungs-E-Mail ist nicht vollständig konfiguriert."
          : "Die Aktivierungs-E-Mail konnte nicht gesendet werden."
      );
    }

    return {
      organization: {
        id: organization.id,
        name: organization.organization_name,
        seatLimit: organization.seat_limit,
        usageDurationDays,
        validUntil: organization.validUntil,
      },
      owner: {
        created: resolvedOwner.created,
        email: resolvedOwner.email,
        userId: resolvedOwner.userId,
      },
    };
  } catch (error) {
    await serviceRoleClient
      .from("organizations")
      .delete()
      .eq("id", organization.id);

    if (resolvedOwner.created) {
      await serviceRoleClient.auth.admin.deleteUser(resolvedOwner.userId);
    }

    throw error;
  }
}
