import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseEnvStatus = {
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  hasUrl: boolean;
};

function getSupabaseEnvStatus(): SupabaseEnvStatus {
  return {
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  };
}

function logSupabaseEnvCheck() {
  const status = getSupabaseEnvStatus();

  console.log("[supabase-server] env check", status);

  return status;
}

export function getSupabaseServerClientInitError() {
  const status = logSupabaseEnvCheck();

  if (!status.hasUrl) {
    return "Missing env: NEXT_PUBLIC_SUPABASE_URL";
  }

  if (!status.hasAnonKey) {
    return "Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY";
  }

  return null;
}

export function getServiceRoleClientInitError() {
  const status = logSupabaseEnvCheck();

  if (!status.hasUrl) {
    return "Missing env: NEXT_PUBLIC_SUPABASE_URL";
  }

  if (!status.hasServiceRoleKey) {
    return "Missing env: SUPABASE_SERVICE_ROLE_KEY";
  }

  return null;
}

export function getSupabaseServerClient(accessToken?: string) {
  const initError = getSupabaseServerClientInitError();

  if (initError) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    }
  );
}

export function getSupabaseServiceRoleClient() {
  const initError = getServiceRoleClientInitError();

  if (initError) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type SupabaseServerClient = SupabaseClient;
