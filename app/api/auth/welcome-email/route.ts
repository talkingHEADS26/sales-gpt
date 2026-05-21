import { NextResponse } from "next/server";

import {
  getSupabaseServerClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";
import { maybeSendWelcomeEmailForUser } from "@/lib/welcome-email-service";

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization");
    const accessToken = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length)
      : undefined;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Nicht autorisiert." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseServerClient(accessToken);
    const serviceRoleClient = getSupabaseServiceRoleClient();

    if (!supabase || !serviceRoleClient) {
      return NextResponse.json(
        { mode: "skipped", reason: "not_configured" },
        { status: 200 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: "Nicht autorisiert." },
        { status: 401 }
      );
    }

    const result = await maybeSendWelcomeEmailForUser({
      serviceRoleClient,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.warn(`[welcome-mailer] Welcome email route failed: ${message}.`);

    return NextResponse.json(
      { mode: "skipped", reason: "send_failed" },
      { status: 200 }
    );
  }
}
