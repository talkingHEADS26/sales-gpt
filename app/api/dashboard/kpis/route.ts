import { NextResponse } from "next/server";

import { isFailure as isPaidAppAuthFailure, requireAuthUser } from "@/lib/auth-server";
import {
  buildDashboardKpiSummary,
  getDashboardKpiSummaryForUser,
} from "@/lib/dashboard-kpis";

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

    try {
      const summary = await getDashboardKpiSummaryForUser(supabase, userId);

      return NextResponse.json({ summary });
    } catch (kpiError) {
      console.warn(
        `[dashboard-kpis] KPI query failed: ${
          kpiError instanceof Error ? kpiError.message : "Unknown error"
        }.`
      );

      return NextResponse.json({
        summary: buildDashboardKpiSummary([], 0, [], 0, [], 0, 0),
      });
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die KPI-Daten konnten nicht geladen werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
