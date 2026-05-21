import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getSupabaseServerClient,
  getSupabaseServerClientInitError,
  getSupabaseServiceRoleClient,
  getServiceRoleClientInitError,
} from "@/lib/supabase-server";

type AuthSuccess = {
  serviceRoleClient: SupabaseClient;
  supabase: SupabaseClient;
  userId: string;
};

type AuthFailure = {
  code?: string;
  error: string;
  status: number;
};

export type AppAuthResult = AuthSuccess | AuthFailure;

export function isFailure(result: AppAuthResult): result is AuthFailure {
  return "error" in result;
}

export async function requireAuthUser(
  authorizationHeader: string | null
): Promise<AppAuthResult> {
  const accessToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : undefined;

  if (!accessToken) {
    return { error: "Nicht autorisiert.", status: 401 };
  }

  const supabase = getSupabaseServerClient(accessToken);
  const serviceRoleClient = getSupabaseServiceRoleClient();

  if (!supabase || !serviceRoleClient) {
    return {
      error:
        getSupabaseServerClientInitError() ??
        getServiceRoleClientInitError() ??
        "Supabase konnte nicht initialisiert werden.",
      status: 500,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Nicht autorisiert.", status: 401 };
  }

  return { serviceRoleClient, supabase, userId: user.id };
}
