import { NextResponse } from "next/server";

import {
  isOrganizationAdminAuthFailure,
  requireOrganizationAdmin,
} from "@/lib/organization-admin-server";

type InvitationRecord = {
  accepted_at: string | null;
  email: string;
  expires_at: string | null;
  id: string;
  organization_id: string;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ inviteId: string }> }
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

    const { inviteId } = await context.params;
    const nowIso = new Date().toISOString();
    const { serviceRoleClient, membership } = authResult;

    const { data: invitation, error: invitationError } = await serviceRoleClient
      .from("invitations")
      .select("id, organization_id, email, accepted_at, expires_at")
      .eq("id", inviteId)
      .eq("organization_id", membership.organization_id)
      .maybeSingle<InvitationRecord>();

    if (invitationError) {
      throw new Error(invitationError.message);
    }

    if (!invitation) {
      return NextResponse.json(
        { error: "Einladung nicht gefunden." },
        { status: 404 }
      );
    }

    const isPending =
      invitation.accepted_at === null &&
      (!invitation.expires_at || new Date(invitation.expires_at) > new Date(nowIso));

    if (!isPending) {
      return NextResponse.json(
        { error: "Nur offene Einladungen können widerrufen werden." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await serviceRoleClient
      .from("invitations")
      .delete()
      .eq("id", invitation.id)
      .eq("organization_id", membership.organization_id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({
      email: invitation.email,
      inviteId: invitation.id,
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die Einladung konnte nicht widerrufen werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
