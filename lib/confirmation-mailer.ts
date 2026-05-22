import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type SendConfirmationEmailParams = {
  confirmationUrl: string;
  recipientEmail: string;
};

export type ConfirmationEmailSendResult =
  | { mode: "sent" }
  | {
      mode: "skipped";
      reason: "not_configured" | "send_failed";
      detail?: string;
    };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logConfirmationMailerWarning(message: string) {
  console.warn(`[confirmation-mailer] ${message}`);
}

function getConfirmationMailerConfig() {
  const mailConfig = getMailEnvironmentConfig();

  for (const warning of mailConfig.warnings) {
    logConfirmationMailerWarning(warning);
  }

  return {
    fromEmail: mailConfig.fromEmail,
    missingEnvVars: mailConfig.missingEnvVars,
    replyToEmail: mailConfig.replyToEmail,
    resendApiKey: mailConfig.resendApiKey,
  };
}

function buildConfirmationEmail(confirmationUrl: string) {
  const safeConfirmationUrl = escapeHtml(confirmationUrl);

  return {
    subject: "Bestätige deine E-Mail-Adresse für AbschlussIO",
    text: [
      "Hallo,",
      "",
      "schön, dass du dabei bist.",
      "",
      "Bitte bestätige jetzt deine E-Mail-Adresse, damit wir deine Registrierung abschließen können.",
      "",
      "E-Mail-Adresse bestätigen:",
      confirmationUrl,
      "",
      "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:",
      confirmationUrl,
      "",
      "AbschlussIO",
    ].join("\n"),
    html: `
      <div style="margin:0;background:#f3f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="margin:0 auto;max-width:640px;overflow:hidden;border:1px solid #dbe5f1;border-radius:24px;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#0f4c81 0%,#153e75 100%);padding:28px 32px;color:#ffffff;">
            <p style="margin:0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.82;">AbschlussIO</p>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">Bestätige deine E-Mail-Adresse für AbschlussIO</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hallo,</p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">schön, dass du dabei bist.</p>
            <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#334155;">
              Bitte bestätige jetzt deine E-Mail-Adresse, damit wir deine Registrierung abschließen können.
            </p>
            <p style="margin:0 0 28px;">
              <a href="${safeConfirmationUrl}" style="display:inline-block;border-radius:999px;background:#0f4c81;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                E-Mail-Adresse bestätigen
              </a>
            </p>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#475569;">
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
            </p>
            <p style="margin:0 0 24px;word-break:break-word;font-size:14px;line-height:1.7;">
              <a href="${safeConfirmationUrl}" style="color:#0f4c81;text-decoration:underline;">${safeConfirmationUrl}</a>
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">AbschlussIO</p>
          </div>
        </div>
      </div>
    `,
  };
}

export async function sendConfirmationEmail({
  confirmationUrl,
  recipientEmail,
}: SendConfirmationEmailParams): Promise<ConfirmationEmailSendResult> {
  const config = getConfirmationMailerConfig();

  if (config.missingEnvVars.length > 0) {
    logConfirmationMailerWarning(
      `Confirmation email skipped because configuration is incomplete: ${config.missingEnvVars.join(
        ", "
      )}.`
    );

    return { mode: "skipped", reason: "not_configured" };
  }

  const email = buildConfirmationEmail(confirmationUrl);

  try {
    const result = await sendResendEmail({
      from: config.fromEmail,
      html: email.html,
      replyTo: config.replyToEmail,
      resendApiKey: config.resendApiKey as string,
      subject: email.subject,
      text: email.text,
      to: [recipientEmail],
    });

    if (!result.ok) {
      logConfirmationMailerWarning(
        `Confirmation email could not be sent: ${result.errorMessage}.`
      );

      return {
        mode: "skipped",
        reason: "send_failed",
        detail: result.errorMessage,
      };
    }

    return { mode: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logConfirmationMailerWarning(`Confirmation email request failed: ${message}.`);

    return { mode: "skipped", reason: "send_failed", detail: message };
  }
}
