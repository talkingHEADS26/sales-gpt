import { NextResponse } from "next/server";

import {
  isOrganizationAdminAuthFailure,
  requireOrganizationAdmin,
} from "@/lib/organization-admin-server";

type MembershipCheck = {
  role_in_org: string;
  user_id: string;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const authResult = await requireOrganizationAdmin(
      request.headers.get("authorization")
    );

    if (isOrganizationAdminAuthFailure(authResult)) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userId } = await context.params;

    if (userId === authResult.userId) {
      return NextResponse.json(
        { error: "Der eigene Owner-Account kann nicht entfernt werden." },
        { status: 400 }
      );
    }

    const [
      membershipResult,
      adminCountResult,
    ] = await Promise.all([
      authResult.supabase
        .from("organization_members")
        .select("user_id, role_in_org")
        .eq("organization_id", authResult.membership.organization_id)
        .eq("user_id", userId)
        .maybeSingle<MembershipCheck>(),
      authResult.supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", authResult.membership.organization_id)
        .eq("role_in_org", "admin"),
    ]);

    const { data: membership, error: membershipError } = membershipResult;

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      );
    }

    if (adminCountResult.error) {
      return NextResponse.json(
        { error: adminCountResult.error.message },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "Dieses Mitglied gehört nicht zu deiner Organisation." },
        { status: 403 }
      );
    }

    if (membership.role_in_org === "admin" && (adminCountResult.count ?? 0) <= 1) {
      return NextResponse.json(
        {
          error:
            "Der letzte Owner der Organisation kann nicht entfernt werden.",
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await authResult.serviceRoleClient
      .from("organization_members")
      .delete()
      .eq("organization_id", authResult.membership.organization_id)
      .eq("user_id", userId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      removedUserId: userId,
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Das Mitglied konnte nicht entfernt werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
