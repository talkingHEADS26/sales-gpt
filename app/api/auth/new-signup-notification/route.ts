import { NextResponse } from "next/server";

import { sendAdminApprovalNotificationEmail } from "@/lib/email/send-admin-approval-notification";
import { logSystemEvent } from "@/lib/system-monitoring";

type RequestBody = {
  email?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const email = body.email?.trim() || "";
    const firstName = body.firstName?.trim() || "";
    const lastName = body.lastName?.trim() || "";
    const organizationName = body.organizationName?.trim() || "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Ungültige E-Mail." }, { status: 400 });
    }

    const result = await sendAdminApprovalNotificationEmail({
      email,
      firstName,
      lastName,
      organizationName,
      registeredAt: new Date().toISOString(),
    });

    if (!result.ok) {
      const errorMessage = "errorMessage" in result ? result.errorMessage : result.message;

      await logSystemEvent({
        message: "Admin approval notification email failed",
        metadata: {
          email,
          error: errorMessage,
          organizationName,
        },
        severity: "error",
        source: "auth",
      });

      console.warn(`[auth] Admin approval notification failed: ${errorMessage}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Signup notification could not be sent.";

    await logSystemEvent({
      message: "Admin approval notification route failed",
      metadata: {
        error: message,
      },
      severity: "error",
      source: "auth",
    });

    console.warn(`[auth] Signup notification route failed: ${message}`);

    return NextResponse.json({ success: false }, { status: 200 });
  }
}
