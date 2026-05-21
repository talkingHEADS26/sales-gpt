import { NextResponse } from "next/server";

import { isAdminAuthFailure, requireMasterAdmin } from "@/lib/admin-server";

type RequestBody = {
  isActive?: boolean;
};

type UpdatedOrganization = {
  id: string;
  is_active: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ organizationId: string }> }
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

    const { organizationId } = await context.params;
    const { isActive } = (await request.json()) as RequestBody;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive ist erforderlich." },
        { status: 400 }
      );
    }

    const { data, error } = await adminAuth.serviceRoleClient
      .from("organizations")
      .update({ is_active: isActive })
      .eq("id", organizationId)
      .select("id, is_active")
      .single<UpdatedOrganization>();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Organisation konnte nicht aktualisiert werden." },
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
        : "Organisation konnte nicht aktualisiert werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
