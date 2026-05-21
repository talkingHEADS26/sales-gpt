import { NextResponse } from "next/server";

import {
  getSupabaseServerClient,
  getSupabaseServerClientInitError,
} from "@/lib/supabase-server";

export async function GET(request: Request) {
  const authorizationHeader = request.headers.get("authorization");
  const accessToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient(accessToken);

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          getSupabaseServerClientInitError() ??
          "Supabase konnte nicht initialisiert werden.",
      },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  return NextResponse.json({ allowed: true, organizationId: null });
}
