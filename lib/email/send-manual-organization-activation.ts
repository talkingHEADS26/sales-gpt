import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type SendManualOrganizationActivationEmailParams = {
  activationUrl: string;
  firstName: string | null;
  recipientEmail: string;
  usageDurationDays: number;
  validUntil: string;
};

export type ManualOrganizationActivationEmailSendResult =
  | {
      mode: "sent";
    }
  | {
      mode: "skipped";
      reason: "not_configured" | "send_failed";
    };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logWarning(message: string) {
  console.warn(`[manual-organization-activation-mailer] ${message}`);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildEmail(params: {
  activationUrl: string;
  firstName: string | null;
  usageDurationDays: number;
  validUntil: string;
}) {
  const firstName = params.firstName?.trim() || "du";
  const safeFirstName = escapeHtml(firstName);
  const safeActivationUrl = escapeHtml(params.activationUrl);
  const validUntilLabel = formatDateTime(params.validUntil);

  return {
    subject: "Dein Zugang zu talkingHEADS Sales Trainer wurde angelegt",
    text: [
      `Hallo ${firstName},`,
      "",
      "für dich wurde ein Zugang zu talkingHEADS Sales Trainer angelegt.",
      "",
      `Dein Zugang ist für ${params.usageDurationDays} Tage freigeschaltet.`,
      `Der Zugang läuft am ${validUntilLabel} ab.`,
      "",
      "Bitte bestätige deine E-Mail-Adresse und lege dein Passwort fest, um dein Konto zu aktivieren.",
      "",
      "Zugang aktivieren:",
      params.activationUrl,
      "",
      "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:",
      params.activationUrl,
      "",
      "Viele Grüße",
      "talkingHEADS Sales Trainer",
    ].join("\n"),
    html: `
      <!doctype html>
      <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Dein Zugang zu talkingHEADS Sales Trainer wurde angelegt</title>
        </head>
        <body style="margin:0;background:#f3f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          <div style="margin:0 auto;max-width:640px;overflow:hidden;border:1px solid #dbe5f1;border-radius:24px;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#0f4c81 0%,#153e75 100%);padding:32px 40px;color:#ffffff;">
              <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.82;">talkingHEADS Sales Trainer</p>
              <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:700;">Dein Zugang wurde angelegt</h1>
            </div>
            <div style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hallo ${safeFirstName},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                für dich wurde ein Zugang zu talkingHEADS Sales Trainer angelegt.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                Dein Zugang ist für ${params.usageDurationDays} Tage freigeschaltet.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                Der Zugang läuft am ${escapeHtml(validUntilLabel)} ab.
              </p>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#334155;">
                Bitte bestätige deine E-Mail-Adresse und lege dein Passwort fest, um dein Konto zu aktivieren.
              </p>
              <p style="margin:0 0 28px;">
                <a href="${safeActivationUrl}" style="display:inline-block;border-radius:999px;background:#0f4c81;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                  Zugang aktivieren
                </a>
              </p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#475569;">
                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-word;font-size:14px;line-height:1.7;">
                <a href="${safeActivationUrl}" style="color:#0f4c81;text-decoration:underline;">${safeActivationUrl}</a>
              </p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
                Viele Grüße<br />
                talkingHEADS Sales Trainer
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export async function sendManualOrganizationActivationEmail({
  activationUrl,
  firstName,
  recipientEmail,
  usageDurationDays,
  validUntil,
}: SendManualOrganizationActivationEmailParams): Promise<ManualOrganizationActivationEmailSendResult> {
  const config = getMailEnvironmentConfig();

  for (const warning of config.warnings) {
    logWarning(warning);
  }

  if (config.missingEnvVars.length > 0) {
    logWarning(
      `Manual organization activation email skipped because configuration is incomplete: ${config.missingEnvVars.join(
        ", "
      )}.`
    );

    return {
      mode: "skipped",
      reason: "not_configured",
    };
  }

  const email = buildEmail({
    activationUrl,
    firstName,
    usageDurationDays,
    validUntil,
  });

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
      logWarning(
        `Manual organization activation email could not be sent: ${result.errorMessage}.`
      );

      return {
        mode: "skipped",
        reason: "send_failed",
      };
    }

    return {
      mode: "sent",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logWarning(
      `Manual organization activation email request failed: ${message}.`
    );

    return {
      mode: "skipped",
      reason: "send_failed",
    };
  }
}
