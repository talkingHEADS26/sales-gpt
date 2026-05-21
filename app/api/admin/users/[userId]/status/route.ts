import { NextResponse } from "next/server";

import { isAdminAuthFailure, requireMasterAdmin } from "@/lib/admin-server";
import { maybeSendWelcomeEmailForUser } from "@/lib/welcome-email-service";

type RequestBody = {
  isActive?: boolean;
};

type UpdatedProfile = {
  id: string;
  is_active: boolean;
};

type MembershipRecord = {
  organization_id: string;
  role_in_org: string;
};

type ExistingProfile = {
  id: string;
  is_active: boolean;
};

export async function PATCH(
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
    const { isActive } = (await request.json()) as RequestBody;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive ist erforderlich." },
        { status: 400 }
      );
    }

    if (userId === adminAuth.userId && !isActive) {
      return NextResponse.json(
        { error: "Der eigene Plattform-Admin-Account kann hier nicht deaktiviert werden." },
        { status: 400 }
      );
    }

    if (!isActive) {
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
                "Der letzte Owner einer Organisation kann nicht deaktiviert werden.",
            },
            { status: 400 }
          );
        }
      }
    }

    const { data: existingProfile, error: existingProfileError } =
      await adminAuth.serviceRoleClient
        .from("profiles")
        .select("id, is_active")
        .eq("id", userId)
        .maybeSingle<ExistingProfile>();

    if (existingProfileError) {
      return NextResponse.json(
        { error: existingProfileError.message },
        { status: 500 }
      );
    }

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Userprofil konnte nicht gefunden werden." },
        { status: 404 }
      );
    }

    const { data, error } = await adminAuth.serviceRoleClient
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId)
      .select("id, is_active")
      .single<UpdatedProfile>();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "User konnte nicht aktualisiert werden." },
        { status: 500 }
      );
    }

    if ((!existingProfile.is_active && data.is_active) || isActive) {
      const welcomeResult = await maybeSendWelcomeEmailForUser({
        serviceRoleClient: adminAuth.serviceRoleClient,
        userId,
      });

      if (welcomeResult.mode !== "sent" && welcomeResult.reason !== "already_sent") {
        console.warn(`[admin] Welcome email skipped for ${userId}: ${welcomeResult.reason}`);
      }
    }

    return NextResponse.json({
      id: data.id,
      isActive: data.is_active,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "User konnte nicht aktualisiert werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
