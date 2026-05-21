import { NextResponse } from "next/server";

import { resolveOrganizationSeatLimit } from "@/lib/copecart-products";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

type InvitationRow = {
  accepted_at: string | null;
  email: string | null;
  expires_at: string | null;
  organization_id: string;
  organizations: {
    is_active: boolean;
    organization_name: string;
    seat_limit: number;
  } | null;
  role_to_assign: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const serviceRoleClient = getSupabaseServiceRoleClient();

    if (!serviceRoleClient) {
      return NextResponse.json(
        { error: "Supabase Server Client konnte nicht initialisiert werden." },
        { status: 500 }
      );
    }

    const { data: invitation, error: invitationError } = await serviceRoleClient
      .from("invitations")
      .select(
        "organization_id, email, role_to_assign, expires_at, accepted_at, organizations!inner(organization_name, seat_limit, is_active)"
      )
      .eq("token", token)
      .maybeSingle<InvitationRow>();

    if (invitationError) {
      throw new Error(invitationError.message);
    }

    if (!invitation) {
      return NextResponse.json(
        {
          invitation: {
            accepted_at: null,
            email: null,
            error_message: "Einladung nicht gefunden.",
            expires_at: null,
            is_valid: false,
            organization_id: null,
            organization_name: null,
            role_to_assign: null,
          },
        },
        { status: 404 }
      );
    }

    if (invitation.accepted_at) {
      return NextResponse.json({
        invitation: {
          accepted_at: invitation.accepted_at,
          email: invitation.email,
          error_message: "Diese Einladung wurde bereits genutzt.",
          expires_at: invitation.expires_at,
          is_valid: false,
          organization_id: invitation.organization_id,
          organization_name: invitation.organizations?.organization_name ?? null,
          role_to_assign: invitation.role_to_assign,
        },
      });
    }

    if (invitation.expires_at && new Date(invitation.expires_at) <= new Date()) {
      return NextResponse.json({
        invitation: {
          accepted_at: invitation.accepted_at,
          email: invitation.email,
          error_message: "Diese Einladung ist abgelaufen.",
          expires_at: invitation.expires_at,
          is_valid: false,
          organization_id: invitation.organization_id,
          organization_name: invitation.organizations?.organization_name ?? null,
          role_to_assign: invitation.role_to_assign,
        },
      });
    }

    if (!invitation.organizations?.is_active) {
      return NextResponse.json({
        invitation: {
          accepted_at: invitation.accepted_at,
          email: invitation.email,
          error_message: "Diese Organisation ist derzeit deaktiviert.",
          expires_at: invitation.expires_at,
          is_valid: false,
          organization_id: invitation.organization_id,
          organization_name: invitation.organizations?.organization_name ?? null,
          role_to_assign: invitation.role_to_assign,
        },
      });
    }

    const [{ count: memberCount, error: membersError }, { count: inviteCount, error: invitesError }] =
      await Promise.all([
        serviceRoleClient
          .from("organization_members")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", invitation.organization_id),
        serviceRoleClient
          .from("invitations")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", invitation.organization_id)
          .is("accepted_at", null)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
      ]);

    if (membersError) {
      throw new Error(membersError.message);
    }

    if (invitesError) {
      throw new Error(invitesError.message);
    }

    const seatLimit = resolveOrganizationSeatLimit({
      seatLimit: invitation.organizations.seat_limit,
    }).seatLimit;
    const pendingInvitations = Math.max((inviteCount ?? 0) - 1, 0);
    const freeSeats = seatLimit - (memberCount ?? 0) - pendingInvitations;

    if (freeSeats <= 0) {
      return NextResponse.json({
        invitation: {
          accepted_at: invitation.accepted_at,
          email: invitation.email,
          error_message: "Das Seat-Limit deiner Organisation ist erreicht.",
          expires_at: invitation.expires_at,
          is_valid: false,
          organization_id: invitation.organization_id,
          organization_name: invitation.organizations.organization_name,
          role_to_assign: invitation.role_to_assign,
        },
      });
    }

    return NextResponse.json({
      invitation: {
        accepted_at: invitation.accepted_at,
        email: invitation.email,
        error_message: null,
        expires_at: invitation.expires_at,
        is_valid: true,
        organization_id: invitation.organization_id,
        organization_name: invitation.organizations.organization_name,
        role_to_assign: invitation.role_to_assign,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die Einladung konnte nicht geladen werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
