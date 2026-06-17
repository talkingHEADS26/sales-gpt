import { sendConfirmationEmail } from "@/lib/confirmation-mailer";
import { getPlanKeyForCopeCartProduct } from "@/lib/copecart-products";
import {
  hasPriorCopeCartPurchaseForEmail,
  upsertPendingCopeCartSubscriptionFromSignupMetadata,
} from "@/lib/copecart-subscriptions";
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

type CreateInvitationSignupUserParams = CreateSignupUserParams;

type EmailLookupResult = {
  emailConfirmedAt: string | null;
  id: string | null;
  exists: boolean;
};

type InvitationRecord = {
  accepted_at: string | null;
  email: string | null;
  expires_at: string | null;
  id: string;
  organization_id: string;
  role_to_assign: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
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
        id: matchingUser.id,
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
    id: null,
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

async function ensureInvitationAcceptance(params: {
  email: string;
  metadata: SignupMetadata;
  serviceRoleClient: ReturnType<typeof getSupabaseServiceRoleClient> extends infer T
    ? NonNullable<T>
    : never;
  userId: string;
}) {
  const invitationToken = readMetadataValue(
    params.metadata,
    "invitation_token",
    "invitationToken",
    "invite_token"
  );

  if (!invitationToken) {
    return;
  }

  const { data: invitation, error: invitationError } = await params.serviceRoleClient
    .from("invitations")
    .select("id, organization_id, email, role_to_assign, expires_at, accepted_at")
    .eq("token", invitationToken)
    .maybeSingle<InvitationRecord>();

  if (invitationError) {
    throw new Error(invitationError.message);
  }

  if (!invitation) {
    throw new Error("Einladung nicht gefunden.");
  }

  if (invitation.accepted_at) {
    return;
  }

  if (invitation.expires_at && new Date(invitation.expires_at) <= new Date()) {
    throw new Error("Diese Einladung ist abgelaufen.");
  }

  if (invitation.email && normalizeEmail(invitation.email) !== normalizeEmail(params.email)) {
    throw new Error("Die Einladung passt nicht zur registrierten E-Mail-Adresse.");
  }

  const firstName = normalizeText(params.metadata.first_name);
  const lastName = normalizeText(params.metadata.last_name);
  const username = normalizeText(params.metadata.username);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;

  const { error: profileError } = await params.serviceRoleClient.from("profiles").upsert(
    {
      id: params.userId,
      first_name: firstName || null,
      full_name: fullName,
      is_active: true,
      last_name: lastName || null,
      role: "org_admin",
      username: username || null,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: membershipError } = await params.serviceRoleClient
    .from("organization_members")
    .upsert(
      {
        organization_id: invitation.organization_id,
        role_in_org: invitation.role_to_assign,
        user_id: params.userId,
      },
      { onConflict: "organization_id,user_id" }
    );

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { error: acceptanceError } = await params.serviceRoleClient
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id)
    .is("accepted_at", null);

  if (acceptanceError) {
    throw new Error(acceptanceError.message);
  }
}
function readMetadataValue(metadata: SignupMetadata, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export async function createSignupUserWithConfirmationEmail({
  email,
  metadata,
  password,
}: CreateSignupUserParams): Promise<CreateSignupUserWithConfirmationEmailResult> {
  const normalizedEmail = normalizeEmail(email);
  const resolvedMetadata = { ...metadata };
  const resolvedCopeCartProductId = readMetadataValue(
    resolvedMetadata,
    "cope_cart_product_id",
    "product_id"
  );
  const resolvedCopeCartOrderId = readMetadataValue(
    resolvedMetadata,
    "cope_cart_order_id",
    "order_id"
  );
  const resolvedCopeCartCustomerEmail = readMetadataValue(
    resolvedMetadata,
    "cope_cart_customer_email",
    "customer_email"
  );
  const hasCopeCartPurchaseContext = Boolean(
    resolvedCopeCartProductId || resolvedCopeCartOrderId
  );
  const productPlanKey = getPlanKeyForCopeCartProduct(
    resolvedCopeCartProductId
  );

  if (productPlanKey) {
    resolvedMetadata.license_plan = productPlanKey;
  }

  if (resolvedCopeCartProductId) {
    resolvedMetadata.cope_cart_product_id = resolvedCopeCartProductId;
    resolvedMetadata.product_id = resolvedCopeCartProductId;
  }

  if (resolvedCopeCartOrderId) {
    resolvedMetadata.cope_cart_order_id = resolvedCopeCartOrderId;
    resolvedMetadata.order_id = resolvedCopeCartOrderId;
  }

  if (resolvedCopeCartCustomerEmail) {
    resolvedMetadata.cope_cart_customer_email = resolvedCopeCartCustomerEmail;
    resolvedMetadata.customer_email = resolvedCopeCartCustomerEmail;
  }

  const serviceRoleClient = getRequiredServiceRoleClient();
  const existingUser = await lookupAuthUserByEmail(normalizedEmail);

  if (existingUser.exists) {
    throw new Error("Für diese E-Mail-Adresse existiert bereits ein Konto.");
  }

  if (!hasCopeCartPurchaseContext) {
    const hasPriorPurchase = await hasPriorCopeCartPurchaseForEmail(
      serviceRoleClient,
      normalizedEmail
    );

    if (!hasPriorPurchase) {
      throw new Error(
        "Für diese E-Mail-Adresse wurde kein CopeCart-Kauf gefunden. Bitte prüfe die E-Mail oder starte den Kauf über die Startseite."
      );
    }
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
    await upsertPendingCopeCartSubscriptionFromSignupMetadata({
      customerEmail: resolvedCopeCartCustomerEmail ?? normalizedEmail,
      orderId: resolvedCopeCartOrderId,
      productId: resolvedCopeCartProductId,
      serviceRoleClient,
      userId: createUserResult.data.user.id,
    });
    await sendConfirmationEmailForUser(normalizedEmail);
    return { confirmationEmailError: null, confirmationEmailSent: true };
  } catch (error) {
    await serviceRoleClient.auth.admin.deleteUser(createUserResult.data.user.id);
    throw error;
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

export async function createInvitationSignupUser({
  email,
  metadata,
  password,
}: CreateInvitationSignupUserParams) {
  const normalizedEmail = normalizeEmail(email);
  const serviceRoleClient = getRequiredServiceRoleClient();
  const existingUser = await lookupAuthUserByEmail(normalizedEmail);

  if (existingUser.exists && existingUser.id) {
    const updateUserResult = await serviceRoleClient.auth.admin.updateUserById(
      existingUser.id,
      {
        email_confirm: true,
        password,
        user_metadata: metadata,
      }
    );

    if (updateUserResult.error || !updateUserResult.data.user) {
      throw new Error(
        updateUserResult.error?.message ??
          "Einladung konnte nicht abgeschlossen werden."
      );
    }

    await ensureInvitationAcceptance({
      email: normalizedEmail,
      metadata,
      serviceRoleClient,
      userId: existingUser.id,
    });

    return;
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
        "Einladung konnte nicht abgeschlossen werden."
    );
  }

  await ensureInvitationAcceptance({
    email: normalizedEmail,
    metadata,
    serviceRoleClient,
    userId: createUserResult.data.user.id,
  });
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
