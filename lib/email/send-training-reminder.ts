import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type TrainingReminderEmailInput = {
  appBaseUrl: string;
  firstName: string | null;
  inactivityTriggered: boolean;
  openFullSalesCount: number;
  openFullSalesTriggered: boolean;
};

type SendTrainingReminderEmailParams = {
  firstName: string | null;
  inactivityTriggered: boolean;
  openFullSalesCount: number;
  openFullSalesTriggered: boolean;
  recipientEmail: string;
};

export type TrainingReminderEmailSendResult =
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

function logTrainingReminderWarning(message: string) {
  console.warn(`[training-reminder-mailer] ${message}`);
}

function getTrainingReminderMailerConfig() {
  const mailConfig = getMailEnvironmentConfig({ requireAppBaseUrl: true });

  for (const warning of mailConfig.warnings) {
    logTrainingReminderWarning(warning);
  }

  return {
    appBaseUrl: mailConfig.appBaseUrl,
    fromEmail: mailConfig.fromEmail,
    missingEnvVars: mailConfig.missingEnvVars,
    replyToEmail: mailConfig.replyToEmail,
    resendApiKey: mailConfig.resendApiKey,
  };
}

function buildTrainingReminderSubject({
  inactivityTriggered,
  openFullSalesTriggered,
}: {
  inactivityTriggered: boolean;
  openFullSalesTriggered: boolean;
}) {
  if (inactivityTriggered && openFullSalesTriggered) {
    return "Mach da weiter, wo du aufgehört hast";
  }

  if (openFullSalesTriggered) {
    return "Dein Training wartet schon";
  }

  return "Zeit für deine nächste Trainingsrunde";
}

function buildTrainingReminderEmail({
  appBaseUrl,
  firstName,
  inactivityTriggered,
  openFullSalesCount,
  openFullSalesTriggered,
}: TrainingReminderEmailInput) {
  const safeName = escapeHtml(firstName?.trim() || "du");
  const dashboardUrl = `${appBaseUrl}/dashboard`;
  const safeDashboardUrl = escapeHtml(dashboardUrl);
  const subject = buildTrainingReminderSubject({
    inactivityTriggered,
    openFullSalesTriggered,
  });
  const intro = `Hi ${firstName?.trim() || "du"},`;
  const bodyLines: string[] = [];

  if (inactivityTriggered) {
    bodyLines.push(
      "du hast seit ein paar Tagen nicht trainiert.",
      "Schon ein kurzes Training hilft dir, wieder reinzukommen."
    );
  }

  if (openFullSalesTriggered) {
    bodyLines.push(
      openFullSalesCount > 1
        ? "Deine begonnenen Full-Sales-Gespräche warten noch auf dich."
        : "Dein begonnenes Full-Sales-Gespräch wartet noch auf dich."
    );
  }

  bodyLines.push("Starte direkt dort weiter, wo du zuletzt aufgehört hast.");

  const text = [
    intro,
    "",
    ...bodyLines,
    "",
    "Zurück ins Dashboard:",
    dashboardUrl,
    "",
    "Viele Grüße",
    "dein talkingHEADS Sales Trainer Team",
  ].join("\n");

  const htmlParagraphs = bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#334155;">${escapeHtml(
          line
        )}</p>`
    )
    .join("");

  return {
    subject,
    text,
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
              <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:700;">Zeit für deine nächste Trainingsrunde</h1>
            </div>
            <div style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${safeName},</p>
              ${htmlParagraphs}
              <p style="margin:0 0 32px;">
                <a href="${safeDashboardUrl}" style="display:inline-block;border-radius:999px;background:#0f4c81;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                  Zurück ins Dashboard
                </a>
              </p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#475569;">
                Falls der Button nicht funktioniert, nutze diesen Link:
              </p>
              <p style="margin:0 0 28px;word-break:break-word;font-size:14px;line-height:1.7;">
                <a href="${safeDashboardUrl}" style="color:#0f4c81;text-decoration:underline;">${safeDashboardUrl}</a>
              </p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
                Viele Grüße<br />
                dein talkingHEADS Sales Trainer Team
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export async function sendTrainingReminderEmail({
  firstName,
  inactivityTriggered,
  openFullSalesCount,
  openFullSalesTriggered,
  recipientEmail,
}: SendTrainingReminderEmailParams): Promise<TrainingReminderEmailSendResult> {
  const config = getTrainingReminderMailerConfig();

  if (config.missingEnvVars.length > 0 || !config.appBaseUrl) {
    logTrainingReminderWarning(
      `Training reminder email skipped because configuration is incomplete: ${config.missingEnvVars.join(
        ", "
      )}.`
    );

    return {
      mode: "skipped",
      reason: "not_configured",
    };
  }

  const email = buildTrainingReminderEmail({
    appBaseUrl: config.appBaseUrl,
    firstName,
    inactivityTriggered,
    openFullSalesCount,
    openFullSalesTriggered,
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
      logTrainingReminderWarning(
        `Training reminder email could not be sent: ${result.errorMessage}.`
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

    logTrainingReminderWarning(
      `Training reminder email request failed: ${message}.`
    );

    return {
      mode: "skipped",
      reason: "send_failed",
    };
  }
}
