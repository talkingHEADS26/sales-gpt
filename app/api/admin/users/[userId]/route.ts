import { NextResponse } from "next/server";

import { isAdminAuthFailure, requireMasterAdmin } from "@/lib/admin-server";

type ProfileRecord = {
  id: string;
  role: string | null;
};

type MembershipRecord = {
  organization_id: string;
  role_in_org: string;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await context.params;

    if (userId === adminAuth.userId) {
      return NextResponse.json(
        { error: "Der eigene Plattform-Admin-Account kann nicht gelöscht werden." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await adminAuth.serviceRoleClient
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle<ProfileRecord>();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "User nicht gefunden." },
        { status: 404 }
      );
    }

    const { data: adminMemberships, error: membershipsError } =
      await adminAuth.serviceRoleClient
        .from("organization_members")
        .select("organization_id, role_in_org")
        .eq("user_id", userId)
        .eq("role_in_org", "admin");

    if (membershipsError) {
      return NextResponse.json(
        { error: membershipsError.message },
        { status: 500 }
      );
    }

    for (const membership of (adminMemberships ?? []) as MembershipRecord[]) {
      const { count, error: adminCountError } = await adminAuth.serviceRoleClient
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .eq("role_in_org", "admin");

      if (adminCountError) {
        return NextResponse.json(
          { error: adminCountError.message },
          { status: 500 }
        );
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          {
            error:
              "Der letzte Owner einer Organisation kann nicht gelöscht werden.",
          },
          { status: 400 }
        );
      }
    }

    const { error: deleteError } = await adminAuth.serviceRoleClient.auth.admin.deleteUser(
      userId,
      false
    );

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "User konnte nicht gelöscht werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
