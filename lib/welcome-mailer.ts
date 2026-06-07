import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type SendWelcomeEmailParams = {
  firstName: string | null;
  recipientEmail: string;
};

export type WelcomeEmailSendResult =
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

function logWelcomeMailerWarning(message: string) {
  console.warn(`[welcome-mailer] ${message}`);
}

function getWelcomeMailerConfig() {
  const mailConfig = getMailEnvironmentConfig({ requireAppBaseUrl: true });

  for (const warning of mailConfig.warnings) {
    logWelcomeMailerWarning(warning);
  }

  return {
    appBaseUrl: mailConfig.appBaseUrl,
    fromEmail: mailConfig.fromEmail,
    missingEnvVars: mailConfig.missingEnvVars,
    replyToEmail: mailConfig.replyToEmail,
    resendApiKey: mailConfig.resendApiKey,
  };
}

function buildWelcomeEmail({
  firstName,
  appBaseUrl,
}: {
  firstName: string | null;
  appBaseUrl: string;
}) {
  const greetingName = firstName?.trim();
  const loginUrl = `${appBaseUrl}/login`;
  const safeGreetingName = greetingName ? `${escapeHtml(greetingName)},` : "";
  const safeLoginUrl = escapeHtml(loginUrl);

  return {
    subject: "Willkommen bei talkingHEADS Sales Trainer",
    text: [
      "Hallo,",
      "",
      "dein Zugang zu talkingHEADS Sales Trainer ist jetzt vollständig eingerichtet.",
      "",
      "Du kannst dich ab sofort einloggen und mit deinem Training starten.",
      "",
      "Jetzt einloggen:",
      loginUrl,
      "",
      "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:",
      loginUrl,
      "",
      "talkingHEADS Sales Trainer",
    ].join("\n"),
    html: `
      <div style="margin:0;background:#f3f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="margin:0 auto;max-width:640px;overflow:hidden;border:1px solid #dbe5f1;border-radius:24px;background:#ffffff;">
          <div style="padding:40px;">
            <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0e51a0;">talkingHEADS Sales Trainer</p>
            <h1 style="margin:0 0 24px;font-size:28px;line-height:1.2;font-weight:700;color:#0f172a;">Willkommen bei talkingHEADS Sales Trainer</h1>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hallo${safeGreetingName ? ` ${safeGreetingName}` : ","}</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#334155;">
              dein Zugang zu talkingHEADS Sales Trainer ist jetzt vollständig eingerichtet.
            </p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#334155;">
              Du kannst dich ab sofort einloggen und mit deinem Training starten.
            </p>
            <p style="margin:0 0 32px;">
              <a href="${safeLoginUrl}" style="display:inline-block;border-radius:999px;background:#0f4c81;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                Jetzt einloggen
              </a>
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#475569;">
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
            </p>
            <p style="margin:0 0 28px;word-break:break-word;font-size:14px;line-height:1.7;">
              <a href="${safeLoginUrl}" style="color:#0f4c81;text-decoration:underline;">${safeLoginUrl}</a>
            </p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">talkingHEADS Sales Trainer</p>
          </div>
        </div>
      </div>
    `,
  };
}

export async function sendWelcomeEmail({
  firstName,
  recipientEmail,
}: SendWelcomeEmailParams): Promise<WelcomeEmailSendResult> {
  const config = getWelcomeMailerConfig();

  if (config.missingEnvVars.length > 0) {
    logWelcomeMailerWarning(
      `Welcome email skipped because configuration is incomplete: ${config.missingEnvVars.join(
        ", "
      )}.`
    );

    return {
      mode: "skipped",
      reason: "not_configured",
    };
  }

  const email = buildWelcomeEmail({
    appBaseUrl: config.appBaseUrl ?? "https://sales.talkingheads.education",
    firstName,
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
      logWelcomeMailerWarning(
        `Welcome email could not be sent: ${result.errorMessage}.`
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

    logWelcomeMailerWarning(`Welcome email request failed: ${message}.`);

    return {
      mode: "skipped",
      reason: "send_failed",
    };
  }
}
