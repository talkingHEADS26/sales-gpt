import { NextResponse } from "next/server";

import {
  createDirectSignupUser,
  createSignupUserWithConfirmationEmail,
} from "@/lib/auth-signup";

type RequestBody = {
  email?: string;
  metadata?: Record<string, string | null>;
  password?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const email = body.email?.trim() || "";
    const password = body.password || "";
    const metadata = body.metadata ?? {};

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Ungültige E-Mail." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json(
        { error: "Passwort ist erforderlich." },
        { status: 400 }
      );
    }

    const registrationMode =
      typeof metadata.registration_mode === "string"
        ? metadata.registration_mode
        : "";

    if (registrationMode === "invitation_accept") {
      await createDirectSignupUser({ email, metadata, password });
      return NextResponse.json({ success: true, confirmationEmailSent: false });
    }

    const signupResult = await createSignupUserWithConfirmationEmail({
      email,
      metadata,
      password,
    });

    return NextResponse.json({
      confirmationEmailError: signupResult.confirmationEmailError,
      confirmationEmailSent: signupResult.confirmationEmailSent,
      success: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Registrierung konnte nicht abgeschlossen werden.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
