import { NextResponse } from "next/server";

import { isAdminAuthFailure, requireMasterAdmin } from "@/lib/admin-server";

type RequestBody = {
  dryRun?: boolean;
};

type CleanupRpcRow = {
  deleted_sessions: number | null;
  dry_run: boolean | null;
  kept_completed_sessions: number | null;
  kept_last_active_full_sales_sessions: number | null;
  success: boolean | null;
};

export async function POST(request: Request) {
  try {
    const adminAuth = await requireMasterAdmin(
      request.headers.get("authorization")
    );

    if (isAdminAuthFailure(adminAuth)) {
      return NextResponse.json(
        { error: adminAuth.error },
        { status: adminAuth.status }
      );
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const dryRun = body.dryRun !== false;

    const { data, error } = await adminAuth.serviceRoleClient.rpc(
      "master_admin_cleanup_sessions",
      {
        p_dry_run: dryRun,
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = Array.isArray(data)
      ? ((data[0] ?? null) as CleanupRpcRow | null)
      : ((data ?? null) as CleanupRpcRow | null);

    if (!result?.success) {
      return NextResponse.json(
        { error: "Die Datenbankbereinigung konnte nicht ausgeführt werden." },
        { status: 500 }
      );
    }

    const responsePayload = {
      success: true,
      dryRun: result.dry_run ?? dryRun,
      deletedSessions: result.deleted_sessions ?? 0,
      keptCompletedSessions: result.kept_completed_sessions ?? 0,
      keptLastActiveFullSalesSessions:
        result.kept_last_active_full_sales_sessions ?? 0,
    };

    console.log("[admin.cleanup-sessions]", {
      actorUserId: adminAuth.userId,
      ...responsePayload,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die Datenbankbereinigung konnte nicht ausgeführt werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
