const OFFICIAL_DOMAIN = "sales.diebestenberatungsagenturen.de";
const OFFICIAL_CONTACT_EMAIL = `io@${OFFICIAL_DOMAIN}`;
const OFFICIAL_MAIL_FROM = `talkingHEADS Sales Trainer <${OFFICIAL_CONTACT_EMAIL}>`;
const INTERNAL_SIGNUP_ALERT_EMAIL = `io@${OFFICIAL_DOMAIN}`;

type MailEnvironmentConfig = {
  appBaseUrl: string | null;
  contactEmail: string;
  fromEmail: string;
  internalSignupAlertEmail: string;
  missingEnvVars: string[];
  monitoringAlertEmail: string;
  replyToEmail: string | null;
  resendApiKey: string | null;
  warnings: string[];
};

function normalizeBaseUrl(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.replace(/\/+$/, "");
}

function normalizeEmail(value?: string | null) {
  const trimmedValue = value?.trim().toLowerCase();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
}

function normalizeMailbox(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  const mailboxMatch = trimmedValue.match(/^(.*)<([^<>]+)>$/);

  if (!mailboxMatch) {
    return trimmedValue.toLowerCase();
  }

  const displayName = mailboxMatch[1]?.trim();
  const email = normalizeEmail(mailboxMatch[2]);

  if (!displayName || !email) {
    return trimmedValue.toLowerCase();
  }

  return `${displayName} <${email}>`;
}

function resolveOfficialEmail(
  envName:
    | "CONTACT_EMAIL"
    | "INTERNAL_SIGNUP_ALERT_EMAIL"
    | "MAIL_REPLY_TO"
    | "MONITORING_ALERT_EMAIL",
  fallback: string,
  warnings: string[]
) {
  const configuredEmail = normalizeEmail(process.env[envName]);

  if (!configuredEmail) {
    return fallback;
  }

  if (configuredEmail !== fallback) {
    warnings.push(
      `${envName} is configured as ${configuredEmail} (official default: ${fallback}).`
    );
  }

  return configuredEmail;
}

function resolveInternalSignupAlertEmail(warnings: string[]) {
  const configuredEmail = normalizeEmail(
    process.env.INTERNAL_SIGNUP_ALERT_EMAIL ??
      process.env.ADMIN_APPROVAL_NOTIFICATION_EMAIL
  );

  if (!configuredEmail) {
    return INTERNAL_SIGNUP_ALERT_EMAIL;
  }

  if (configuredEmail !== INTERNAL_SIGNUP_ALERT_EMAIL) {
    warnings.push(
      `INTERNAL_SIGNUP_ALERT_EMAIL should be ${INTERNAL_SIGNUP_ALERT_EMAIL}. Falling back to the configured alert recipient.`
    );
  }

  return configuredEmail;
}

function resolveOfficialMailbox(
  envName: "MAIL_FROM",
  fallback: string,
  warnings: string[]
) {
  const configuredMailbox = normalizeMailbox(process.env[envName]);

  if (!configuredMailbox) {
    return fallback;
  }

  if (configuredMailbox !== fallback) {
    warnings.push(
      `${envName} is configured as ${configuredMailbox} (official default: ${fallback}).`
    );
  }

  return configuredMailbox;
}

export function getMailEnvironmentConfig(options?: {
  requireAppBaseUrl?: boolean;
}): MailEnvironmentConfig {
  const warnings: string[] = [];
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || null;
  const appBaseUrl = normalizeBaseUrl(
    process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  );
  const missingEnvVars: string[] = [];

  if (!resendApiKey) {
    missingEnvVars.push("RESEND_API_KEY");
  }

  if (options?.requireAppBaseUrl && !appBaseUrl) {
    missingEnvVars.push("APP_BASE_URL|NEXT_PUBLIC_APP_URL");
  }

  return {
    appBaseUrl,
    contactEmail: resolveOfficialEmail(
      "CONTACT_EMAIL",
      OFFICIAL_CONTACT_EMAIL,
      warnings
    ) as string,
    fromEmail: resolveOfficialMailbox(
      "MAIL_FROM",
      OFFICIAL_MAIL_FROM,
      warnings
    ) as string,
    internalSignupAlertEmail: resolveInternalSignupAlertEmail(warnings),
    missingEnvVars,
    monitoringAlertEmail: resolveOfficialEmail(
      "MONITORING_ALERT_EMAIL",
      OFFICIAL_CONTACT_EMAIL,
      warnings
    ) as string,
    replyToEmail: resolveOfficialEmail(
      "MAIL_REPLY_TO",
      OFFICIAL_CONTACT_EMAIL,
      warnings
    ),
    resendApiKey,
    warnings,
  };
}

export {
  INTERNAL_SIGNUP_ALERT_EMAIL,
  OFFICIAL_CONTACT_EMAIL,
  OFFICIAL_DOMAIN,
  OFFICIAL_MAIL_FROM,
  normalizeBaseUrl,
};
