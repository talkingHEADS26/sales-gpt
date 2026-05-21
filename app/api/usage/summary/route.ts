import { NextResponse } from "next/server";

import { isFailure as isPaidAppAuthFailure, requireAuthUser } from "@/lib/auth-server";
import {
  getCurrentUtcMonthRange,
  MAX_AUDIO_SECONDS_PER_SESSION,
  MONTHLY_SESSION_LIMIT,
} from "@/lib/usage-limits";

export async function GET(request: Request) {
  try {
    const authResult = await requireAuthUser(
      request.headers.get("authorization")
    );

    if (isPaidAppAuthFailure(authResult)) {
      return NextResponse.json(
        { code: authResult.code, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { supabase, userId } = authResult;

    const monthRange = getCurrentUtcMonthRange();
    const { count, error: usageCountError } = await supabase
      .from("chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthRange.start)
      .lt("created_at", monthRange.end);

    if (usageCountError) {
      return NextResponse.json(
        { error: usageCountError.message },
        { status: 500 }
      );
    }

    const usedSessions = count ?? 0;

    return NextResponse.json({
      audioLimitSeconds: MAX_AUDIO_SECONDS_PER_SESSION,
      monthlySessionLimit: MONTHLY_SESSION_LIMIT,
      monthEnd: monthRange.end,
      monthStart: monthRange.start,
      remainingSessions: Math.max(0, MONTHLY_SESSION_LIMIT - usedSessions),
      success: true,
      usedSessions,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die Usage-Daten konnten nicht geladen werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
