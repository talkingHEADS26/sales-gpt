import { sendConfirmationEmail } from "@/lib/confirmation-mailer";
import {
  getPlanKeyForCopeCartProduct,
  getSeatLimitForPlanKey,
} from "@/lib/copecart-products";
import { upsertPendingCopeCartSubscriptionFromSignupMetadata } from "@/lib/copecart-subscriptions";
import { getSignupConfirmationRedirectUrl } from "@/lib/site-url";
import {
  getServiceRoleClientInitError,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";

type SignupMetadata = Record<string, string | null>;

type CreateSignupUserParams = {
  email: string;
  metadata: SignupMetadata;
  password: string;
};

type CreateSignupUserWithConfirmationEmailResult = {
  confirmationEmailError: string | null;
  confirmationEmailSent: boolean;
};

type EmailLookupResult = {
  emailConfirmedAt: string | null;
  exists: boolean;
};

type ProfileRow = {
  id: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getRequiredServiceRoleClient() {
  const serviceRoleClient = getSupabaseServiceRoleClient();

  if (!serviceRoleClient) {
    throw new Error(
      getServiceRoleClientInitError() ??
        "Supabase Service Role Client konnte nicht initialisiert werden."
    );
  }

  return serviceRoleClient;
}

async function lookupAuthUserByEmail(email: string): Promise<EmailLookupResult> {
  const serviceRoleClient = getRequiredServiceRoleClient();
  let page = 1;
  const perPage = 200;
  const normalizedEmail = normalizeEmail(email);

  while (true) {
    const { data, error } = await serviceRoleClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(error.message);
    }

    const matchingUser = data.users.find(
      (user) => normalizeEmail(user.email ?? "") === normalizedEmail
    );

    if (matchingUser) {
      return {
        emailConfirmedAt: matchingUser.email_confirmed_at ?? null,
        exists: true,
      };
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return {
    emailConfirmedAt: null,
    exists: false,
  };
}

async function sendConfirmationEmailForUser(email: string) {
  const serviceRoleClient = getRequiredServiceRoleClient();
  const generateLinkResult = await serviceRoleClient.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: getSignupConfirmationRedirectUrl(),
    },
  });

  if (generateLinkResult.error || !generateLinkResult.data.properties?.action_link) {
    throw new Error(
      generateLinkResult.error?.message ??
        "Bestätigungslink konnte nicht erstellt werden."
    );
  }

  const sendResult = await sendConfirmationEmail({
    confirmationUrl: generateLinkResult.data.properties.action_link,
    recipientEmail: email,
  });

  if (sendResult.mode !== "sent") {
    throw new Error(
      sendResult.reason === "not_configured"
        ? "Bestätigungs-E-Mail ist nicht vollständig konfiguriert."
        : sendResult.detail
          ? `Bestätigungs-E-Mail konnte nicht gesendet werden: ${sendResult.detail}`
          : "Bestätigungs-E-Mail konnte nicht gesendet werden."
    );
  }
}

async function ensureOrganizationSignupProvisioning(params: {
  metadata: SignupMetadata;
  serviceRoleClient: ReturnType<typeof getRequiredServiceRoleClient>;
  userEmail: string;
  userId: string;
}) {
  const registrationMode = params.metadata.registration_mode;

  if (registrationMode !== "organization_signup") {
    return;
  }

  const { data: existingMembership } = await params.serviceRoleClient
    .from("organization_members")
    .select("id")
    .eq("user_id", params.userId)
    .eq("role_in_org", "admin")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingMembership?.id) {
    return;
  }

  const firstName = params.metadata.first_name?.trim() || "";
  const lastName = params.metadata.last_name?.trim() || "";
  const username = params.metadata.username?.trim() || "";
  const organizationName =
    params.metadata.organization_name?.trim() || "Neue Organisation";
  const licensePlan = params.metadata.license_plan?.trim() || "solo";
  const industryKey = params.metadata.industry_key?.trim() || "fitness";
  const franchiseVertical =
    industryKey === "franchise"
      ? params.metadata.franchise_vertical?.trim() || "other"
      : null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const seatLimit = getSeatLimitForPlanKey(licensePlan) ?? 1;

  const { data: existingProfile, error: existingProfileError } =
    await params.serviceRoleClient
      .from("profiles")
      .select("id")
      .eq("id", params.userId)
      .maybeSingle<ProfileRow>();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  if (!existingProfile) {
    const { error: profileInsertError } = await params.serviceRoleClient
      .from("profiles")
      .insert({
        first_name: firstName || null,
        full_name: fullName,
        id: params.userId,
        is_active: true,
        last_name: lastName || null,
        role: "org_admin",
        username: username || params.userEmail,
      });

    if (profileInsertError) {
      throw new Error(profileInsertError.message);
    }
  }

  const { data: createdOrganization, error: organizationInsertError } =
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

  if (organizationInsertError || !createdOrganization) {
    throw new Error(
      organizationInsertError?.message ??
        "Organisation konnte nicht erstellt werden."
    );
  }

  const [{ error: memberInsertError }, { error: subscriptionInsertError }] =
    await Promise.all([
      params.serviceRoleClient.from("organization_members").insert({
        organization_id: createdOrganization.id,
        role_in_org: "admin",
        user_id: params.userId,
      }),
      params.serviceRoleClient.from("subscriptions").insert({
        organization_id: createdOrganization.id,
        plan_key: licensePlan,
        status: "active",
      }),
    ]);

  if (memberInsertError || subscriptionInsertError) {
    throw new Error(
      memberInsertError?.message ??
        subscriptionInsertError?.message ??
        "Provisionierung der Team-Struktur fehlgeschlagen."
    );
  }
}

export async function createSignupUserWithConfirmationEmail({
  email,
  metadata,
  password,
}: CreateSignupUserParams): Promise<CreateSignupUserWithConfirmationEmailResult> {
  const normalizedEmail = normalizeEmail(email);
  const resolvedMetadata = { ...metadata };
  const productPlanKey = getPlanKeyForCopeCartProduct(
    typeof resolvedMetadata.cope_cart_product_id === "string"
      ? resolvedMetadata.cope_cart_product_id
      : null
  );

  if (productPlanKey) {
    resolvedMetadata.license_plan = productPlanKey;
  }

  const serviceRoleClient = getRequiredServiceRoleClient();
  const existingUser = await lookupAuthUserByEmail(normalizedEmail);

  if (existingUser.exists) {
    throw new Error("Für diese E-Mail-Adresse existiert bereits ein Konto.");
  }

  const createUserResult = await serviceRoleClient.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: false,
    password,
    user_metadata: resolvedMetadata,
  });

  if (createUserResult.error || !createUserResult.data.user) {
    throw new Error(
      createUserResult.error?.message ??
        "Registrierung konnte nicht abgeschlossen werden."
    );
  }

  try {
    await ensureOrganizationSignupProvisioning({
      metadata: resolvedMetadata,
      serviceRoleClient,
      userEmail: normalizedEmail,
      userId: createUserResult.data.user.id,
    });

    await upsertPendingCopeCartSubscriptionFromSignupMetadata({
      customerEmail:
        typeof resolvedMetadata.cope_cart_customer_email === "string"
          ? resolvedMetadata.cope_cart_customer_email
          : normalizedEmail,
      orderId:
        typeof resolvedMetadata.cope_cart_order_id === "string"
          ? resolvedMetadata.cope_cart_order_id
          : null,
      productId:
        typeof resolvedMetadata.cope_cart_product_id === "string"
          ? resolvedMetadata.cope_cart_product_id
          : null,
      serviceRoleClient,
      userId: createUserResult.data.user.id,
    });
  } catch (error) {
    await serviceRoleClient.auth.admin.deleteUser(createUserResult.data.user.id);
    throw error;
  }

  try {
    await sendConfirmationEmailForUser(normalizedEmail);
    return { confirmationEmailError: null, confirmationEmailSent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `[auth-signup] Confirmation email send failed for ${normalizedEmail}: ${message}`
    );
    return { confirmationEmailError: message, confirmationEmailSent: false };
  }
}

export async function createDirectSignupUser({
  email,
  metadata,
  password,
}: CreateSignupUserParams) {
  const normalizedEmail = normalizeEmail(email);
  const serviceRoleClient = getRequiredServiceRoleClient();
  const existingUser = await lookupAuthUserByEmail(normalizedEmail);

  if (existingUser.exists) {
    throw new Error("Für diese E-Mail-Adresse existiert bereits ein Konto.");
  }

  const createUserResult = await serviceRoleClient.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    password,
    user_metadata: metadata,
  });

  if (createUserResult.error || !createUserResult.data.user) {
    throw new Error(
      createUserResult.error?.message ??
        "Registrierung konnte nicht abgeschlossen werden."
    );
  }
}

export async function resendSignupConfirmationEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await lookupAuthUserByEmail(normalizedEmail);

  if (!existingUser.exists) {
    return { mode: "skipped" as const, reason: "user_not_found" as const };
  }

  if (existingUser.emailConfirmedAt) {
    return { mode: "skipped" as const, reason: "already_confirmed" as const };
  }

  await sendConfirmationEmailForUser(normalizedEmail);

  return { mode: "sent" as const };
}
