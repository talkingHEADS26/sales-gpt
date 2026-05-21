import { NextResponse } from "next/server";

import { sendEnterpriseInquiryEmail } from "@/lib/enterprise-inquiry-mailer";

type RequestBody = {
  email?: string;
  inquiryType?: "demo" | "enterprise";
  message?: string;
  name?: string;
  phone?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const name = body.name?.trim() || "";
    const email = body.email?.trim() || "";
    const inquiryType = body.inquiryType;
    const message = body.message?.trim() || "";
    const phone = body.phone?.trim() || "";

    if (!inquiryType || !["demo", "enterprise"].includes(inquiryType)) {
      return NextResponse.json(
        { error: "Der Anfrage-Typ ist ungültig." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Bitte gib deinen Namen ein." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Bitte gib deine Telefonnummer ein." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Bitte gib eine kurze Nachricht ein." },
        { status: 400 }
      );
    }

    const sendResult = await sendEnterpriseInquiryEmail({
      email,
      inquiryType,
      message,
      name,
      phone,
    });

    if (sendResult.mode !== "sent") {
      const errorMessage =
        sendResult.reason === "not_configured"
          ? sendResult.message
          : `Der Versand wurde vom Mail-Provider abgelehnt: ${sendResult.message}`;

      console.warn(`[enterprise-inquiry] Send failed: ${errorMessage}`);

      return NextResponse.json(
        {
          error: errorMessage,
          success: false,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.warn(`[enterprise-inquiry] Inquiry route failed: ${message}.`);

    return NextResponse.json(
      {
        error: "Die Anfrage konnte nicht versendet werden. Bitte versuche es erneut.",
        success: false,
      },
      { status: 500 }
    );
  }
}
