import { NextResponse } from "next/server";

import {
  isOrganizationAdminAuthFailure,
  requireOrganizationAdmin,
} from "@/lib/organization-admin-server";

type RequestBody = {
  isActive?: boolean;
};

type MembershipCheck = {
  role_in_org: string;
  user_id: string;
};

type UpdatedProfile = {
  id: string;
  is_active: boolean;
};

export async function PATCH(
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
    const { isActive } = (await request.json()) as RequestBody;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive ist erforderlich." },
        { status: 400 }
      );
    }

    if (userId === authResult.userId && !isActive) {
      return NextResponse.json(
        { error: "Der eigene Owner-Account kann hier nicht deaktiviert werden." },
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

    if (
      membership.role_in_org === "admin" &&
      !isActive &&
      (adminCountResult.count ?? 0) <= 1
    ) {
      return NextResponse.json(
        {
          error:
            "Der letzte Owner der Organisation kann nicht deaktiviert werden.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await authResult.serviceRoleClient
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId)
      .select("id, is_active")
      .single<UpdatedProfile>();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Der User-Status konnte nicht aktualisiert werden." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      isActive: data.is_active,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Der User-Status konnte nicht aktualisiert werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
