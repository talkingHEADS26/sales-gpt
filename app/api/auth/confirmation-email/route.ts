import { NextResponse } from "next/server";

import { resendSignupConfirmationEmail } from "@/lib/auth-signup";

type RequestBody = {
  email?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const email = body.email?.trim() || "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Ungültige E-Mail." }, { status: 400 });
    }

    const result = await resendSignupConfirmationEmail(email);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Bestätigungs-E-Mail konnte nicht gesendet werden.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
