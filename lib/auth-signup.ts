import { sendConfirmationEmail } from "@/lib/confirmation-mailer";
import { getPlanKeyForCopeCartProduct } from "@/lib/copecart-products";
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

type EmailLookupResult = {
  emailConfirmedAt: string | null;
  exists: boolean;
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
        : "Bestätigungs-E-Mail konnte nicht gesendet werden."
    );
  }
}

export async function createSignupUserWithConfirmationEmail({
  email,
  metadata,
  password,
}: CreateSignupUserParams) {
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
    await sendConfirmationEmailForUser(normalizedEmail);
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
