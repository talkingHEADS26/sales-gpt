function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

const OFFICIAL_PRODUCTION_APP_URL = "https://abschluss-io.de";

function isLocalhostOrigin(value: string) {
  return /\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
}

export function getRequiredPublicAppUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "";

  if (!envUrl) {
    if (typeof window !== "undefined" && window.location.origin) {
      const browserOrigin = trimTrailingSlash(window.location.origin);

      if (!isLocalhostOrigin(browserOrigin)) {
        return browserOrigin;
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[site-url] Missing public app URL env. Falling back to the official production URL."
      );

      return OFFICIAL_PRODUCTION_APP_URL;
    }

    console.error(
      "[site-url] Missing public app URL env in production. Falling back to official production URL."
    );

    return OFFICIAL_PRODUCTION_APP_URL;
  }

  return trimTrailingSlash(envUrl);
}

function getAuthRedirectBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "";

  if (!envUrl) {
    console.error(
      "[site-url] Missing public app URL env for auth redirects. Falling back to official production URL."
    );

    return OFFICIAL_PRODUCTION_APP_URL;
  }

  const normalizedUrl = trimTrailingSlash(envUrl);

  if (isLocalhostOrigin(normalizedUrl)) {
    console.error(
      "[site-url] Localhost app URL detected for auth redirects. Falling back to official production URL."
    );

    return OFFICIAL_PRODUCTION_APP_URL;
  }

  return normalizedUrl;
}

export function getPasswordResetRedirectUrl() {
  // Supabase Auth must allow these production URLs in site/redirect settings.
  // Keep `https://abschluss-io.de/reset-password` and
  // `https://abschluss-io.de/login?confirmed=1` allowed in production.
  return `${getAuthRedirectBaseUrl()}/reset-password`;
}

export function getSignupConfirmationRedirectUrl() {
  return `${getAuthRedirectBaseUrl()}/login?confirmed=1`;
}

export function getEmailConfirmationRedirectUrl() {
  return getSignupConfirmationRedirectUrl();
}
