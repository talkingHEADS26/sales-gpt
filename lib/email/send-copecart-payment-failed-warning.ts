import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type SendCopeCartPaymentFailedWarningEmailParams = {
  firstName: string | null;
  recipientEmail: string;
};

export type CopeCartPaymentFailedWarningEmailSendResult =
  | {
      messageId: string | null;
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

function logMailerWarning(message: string) {
  console.warn(`[copecart-payment-failed-mailer] ${message}`);
}

function buildPaymentFailedEmail({ firstName }: { firstName: string | null }) {
  const subject = "Zahlung für talkingHEADS Sales Trainer fehlgeschlagen";
  const greetingName = firstName?.trim() || "du";
  const safeGreetingName = escapeHtml(greetingName);

  return {
    subject,
    text: [
      `Hallo ${greetingName},`,
      "",
      "die Abbuchung für deinen talkingHEADS Sales Trainer-Zugang konnte leider nicht erfolgreich durchgeführt werden.",
      "",
      "Dein Zugang bleibt noch 72 Stunden aktiv. Bitte aktualisiere deine Zahlungsdaten bzw. stelle sicher, dass die nächste Abbuchung erfolgreich durchgeführt werden kann.",
      "",
      "Wenn innerhalb dieser Frist keine erfolgreiche Zahlung eingeht, wird der Zugang deiner Organisation vorübergehend gesperrt.",
      "",
      "Sobald die Zahlung erfolgreich nachgeholt wurde, bleibt dein Zugang automatisch aktiv.",
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
          <title>${escapeHtml(subject)}</title>
        </head>
        <body style="margin:0;background:#f3f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          <div style="margin:0 auto;max-width:640px;overflow:hidden;border:1px solid #dbe5f1;border-radius:24px;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#0f4c81 0%,#153e75 100%);padding:32px 40px;color:#ffffff;">
              <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.82;">talkingHEADS Sales Trainer</p>
              <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:700;">Zahlung fehlgeschlagen</h1>
            </div>
            <div style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hallo ${safeGreetingName},</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#334155;">
                die Abbuchung für deinen talkingHEADS Sales Trainer-Zugang konnte leider nicht erfolgreich durchgeführt werden.
              </p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#334155;">
                Dein Zugang bleibt noch 72 Stunden aktiv. Bitte aktualisiere deine Zahlungsdaten bzw. stelle sicher, dass die nächste Abbuchung erfolgreich durchgeführt werden kann.
              </p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#334155;">
                Wenn innerhalb dieser Frist keine erfolgreiche Zahlung eingeht, wird der Zugang deiner Organisation vorübergehend gesperrt.
              </p>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#334155;">
                Sobald die Zahlung erfolgreich nachgeholt wurde, bleibt dein Zugang automatisch aktiv.
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

export async function sendCopeCartPaymentFailedWarningEmail({
  firstName,
  recipientEmail,
}: SendCopeCartPaymentFailedWarningEmailParams): Promise<CopeCartPaymentFailedWarningEmailSendResult> {
  const config = getMailEnvironmentConfig();

  for (const warning of config.warnings) {
    logMailerWarning(warning);
  }

  if (config.missingEnvVars.length > 0) {
    logMailerWarning(
      `Payment failed warning skipped because configuration is incomplete: ${config.missingEnvVars.join(
        ", "
      )}.`
    );

    return {
      mode: "skipped",
      reason: "not_configured",
    };
  }

  const email = buildPaymentFailedEmail({ firstName });

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
      logMailerWarning(
        `Payment failed warning could not be sent: ${result.errorMessage}.`
      );

      return {
        mode: "skipped",
        reason: "send_failed",
      };
    }

    return {
      messageId: result.messageId ?? null,
      mode: "sent",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logMailerWarning(
      `Payment failed warning request failed: ${message}.`
    );

    return {
      mode: "skipped",
      reason: "send_failed",
    };
  }
}
