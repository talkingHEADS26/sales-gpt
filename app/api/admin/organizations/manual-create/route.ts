import { NextResponse } from "next/server";

import { isAdminAuthFailure, requireMasterAdmin } from "@/lib/admin-server";
import { createManualOrganizationWithOwner } from "@/lib/manual-organization-admin";
import { logSystemEvent } from "@/lib/system-monitoring";

type RequestBody = {
  organizationName?: string;
  ownerEmail?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  seatLimit?: number;
  usage_duration_days?: number;
  usageDurationDays?: number;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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

    const body = (await request.json()) as RequestBody;
    const organizationName = body.organizationName?.trim() || "";
    const ownerFirstName = body.ownerFirstName?.trim() || "";
    const ownerLastName = body.ownerLastName?.trim() || "";
    const ownerEmail = body.ownerEmail?.trim().toLowerCase() || "";
    const seatLimit = body.seatLimit;
    const usageDurationDays =
      body.usage_duration_days ?? body.usageDurationDays;

    if (!organizationName) {
      return NextResponse.json(
        { error: "Organisationsname ist erforderlich." },
        { status: 400 }
      );
    }

    if (!ownerFirstName) {
      return NextResponse.json(
        { error: "Vorname Inhaber ist erforderlich." },
        { status: 400 }
      );
    }

    if (!ownerLastName) {
      return NextResponse.json(
        { error: "Nachname Inhaber ist erforderlich." },
        { status: 400 }
      );
    }

    if (!ownerEmail || !isValidEmail(ownerEmail)) {
      return NextResponse.json(
        { error: "E-Mail Inhaber ist ungültig." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(seatLimit) || (seatLimit ?? 0) <= 0) {
      return NextResponse.json(
        { error: "Seat-Limit muss eine positive ganze Zahl sein." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(usageDurationDays) || (usageDurationDays ?? 0) <= 0) {
      return NextResponse.json(
        { error: "Nutzungsdauer in Tagen muss eine positive ganze Zahl sein." },
        { status: 400 }
      );
    }

    const validatedSeatLimit = seatLimit as number;
    const validatedUsageDurationDays = usageDurationDays as number;

    const result = await createManualOrganizationWithOwner({
      organizationName,
      owner: {
        email: ownerEmail,
        firstName: ownerFirstName,
        lastName: ownerLastName,
      },
      seatLimit: validatedSeatLimit,
      serviceRoleClient: adminAuth.serviceRoleClient,
      usageDurationDays: validatedUsageDurationDays,
    });

    return NextResponse.json({
      activationMail: "sent",
      activationMailReason: null,
      organizationId: result.organization.id,
      organizationName: result.organization.name,
      ownerEmail: result.owner.email,
      ownerUserCreated: result.owner.created,
      ownerUserId: result.owner.userId,
      seatLimit: result.organization.seatLimit,
      usageDurationDays: result.organization.usageDurationDays,
      validUntil: result.organization.validUntil,
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Die Organisation konnte nicht manuell angelegt werden.";

    await logSystemEvent({
      message: "Manual organization creation failed",
      metadata: {
        error: message,
      },
      severity: "error",
      source: "admin_manual_org_create",
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
