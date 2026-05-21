import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { resolveOrganizationSeatLimit } from "@/lib/copecart-products";
import {
  isOrganizationAdminAuthFailure,
  requireOrganizationAdmin,
} from "@/lib/organization-admin-server";
import { sendInviteEmail } from "@/lib/invite-mailer";

type RequestBody = {
  email?: string;
};

type SubscriptionRecord = {
  plan_key: string;
};

type MembershipRecord = {
  user_id: string;
};

type InvitationRecord = {
  email: string | null;
  id: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
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

    const { email } = (await request.json()) as RequestBody;
    const normalizedEmail = email ? normalizeEmail(email) : "";

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }

    const organization = authResult.membership.organizations;

    if (!organization) {
      return NextResponse.json(
        { error: "Organisation konnte nicht aufgelöst werden." },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();
    const [subscriptionResult, membersResult, pendingInvitesResult] =
      await Promise.all([
        authResult.serviceRoleClient
          .from("subscriptions")
          .select("plan_key")
          .eq("organization_id", authResult.membership.organization_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<SubscriptionRecord>(),
        authResult.serviceRoleClient
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", authResult.membership.organization_id),
        authResult.serviceRoleClient
          .from("invitations")
          .select("id, email")
          .eq("organization_id", authResult.membership.organization_id)
          .is("accepted_at", null)
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
      ]);

    if (subscriptionResult.error) {
      throw new Error(subscriptionResult.error.message);
    }

    if (membersResult.error) {
      throw new Error(membersResult.error.message);
    }

    if (pendingInvitesResult.error) {
      throw new Error(pendingInvitesResult.error.message);
    }

    const members = (membersResult.data ?? []) as MembershipRecord[];
    const pendingInvitations = (pendingInvitesResult.data ?? []) as InvitationRecord[];
    const effectiveSeatLimit = resolveOrganizationSeatLimit({
      planKey: subscriptionResult.data?.plan_key ?? null,
      seatLimit: organization.seat_limit,
    }).seatLimit;

    if (members.length + pendingInvitations.length >= effectiveSeatLimit) {
      return NextResponse.json(
        { error: "Das Seat-Limit deiner Organisation ist erreicht." },
        { status: 400 }
      );
    }

    const existingPendingInvitation = pendingInvitations.find(
      (invitation) => invitation.email?.toLowerCase() === normalizedEmail
    );

    if (existingPendingInvitation) {
      return NextResponse.json(
        { error: "Für diese E-Mail existiert bereits eine offene Einladung." },
        { status: 400 }
      );
    }

    const authUsersResult = await authResult.serviceRoleClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authUsersResult.error) {
      throw new Error(authUsersResult.error.message);
    }

    const memberUserIds = new Set(members.map((member) => member.user_id));
    const existingMemberWithEmail = authUsersResult.data.users.find(
      (user) =>
        user.email?.toLowerCase() === normalizedEmail && memberUserIds.has(user.id)
    );

    if (existingMemberWithEmail) {
      return NextResponse.json(
        { error: "Diese E-Mail-Adresse gehört bereits zu einem aktiven Teammitglied." },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    const { data: insertedInvitation, error: insertError } = await authResult.serviceRoleClient
      .from("invitations")
      .insert({
        email: normalizedEmail,
        expires_at: expiresAt,
        organization_id: authResult.membership.organization_id,
        role_to_assign: "member",
        token,
      })
      .select("id")
      .single<Pick<InvitationRecord, "id">>();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const mailResult = await sendInviteEmail({
      inviteToken: token,
      organizationName: organization.organization_name,
      recipientEmail: normalizedEmail,
      requestOrigin: new URL(request.url).origin,
    });

    return NextResponse.json({
      email: normalizedEmail,
      expiresAt,
      inviteId: insertedInvitation.id,
      inviteLink: mailResult.mode === "manual" ? mailResult.inviteLink : null,
      mailDelivery: mailResult.mode,
      mailDeliveryReason: mailResult.mode === "manual" ? mailResult.reason : null,
      pendingInvitationCount: pendingInvitations.length + 1,
      planKey: subscriptionResult.data?.plan_key ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die Einladung konnte nicht erstellt werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
