import {
  getMailEnvironmentConfig,
  normalizeBaseUrl,
} from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type SendInviteEmailParams = {
  inviteToken: string;
  organizationName: string;
  recipientEmail: string;
  requestOrigin?: string;
};

type InviteEmailFallbackReason = "not_configured" | "send_failed";

type InviteMailerConfig = {
  fromEmail: string;
  inviteLink: string;
  missingEnvVars: string[];
  replyToEmail: string | null;
  resendApiKey: string | null;
};

export type InviteEmailSendResult =
  | {
      inviteLink: string;
      mode: "sent";
    }
  | {
      inviteLink: string;
      mode: "manual";
      reason: InviteEmailFallbackReason;
    };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildInviteLink(baseUrl: string | null, inviteToken: string) {
  if (!baseUrl) {
    return `/invite/${inviteToken}`;
  }

  return `${baseUrl}/invite/${inviteToken}`;
}

function logInviteMailerWarning(message: string) {
  console.warn(`[invite-mailer] ${message}`);
}

function getInviteMailerConfig(
  inviteToken: string,
  requestOrigin?: string
): InviteMailerConfig {
  const mailConfig = getMailEnvironmentConfig({ requireAppBaseUrl: true });

  for (const warning of mailConfig.warnings) {
    logInviteMailerWarning(warning);
  }

  return {
    fromEmail: mailConfig.fromEmail,
    inviteLink: buildInviteLink(
      mailConfig.appBaseUrl || normalizeBaseUrl(requestOrigin),
      inviteToken
    ),
    missingEnvVars: mailConfig.missingEnvVars,
    replyToEmail: mailConfig.replyToEmail,
    resendApiKey: mailConfig.resendApiKey,
  };
}

function buildInviteEmail({
  inviteLink,
  organizationName,
}: {
  inviteLink: string;
  organizationName: string;
}) {
  const safeInviteLink = escapeHtml(inviteLink);
  const safeOrganizationName = escapeHtml(organizationName);

  return {
    subject: "Du wurdest zu AbschlussIO eingeladen",
    text: [
      "Hi,",
      "",
      `du wurdest zu ${organizationName} in AbschlussIO eingeladen.`,
      "",
      "Dein Team nutzt AbschlussIO, um Verkaufsgespräche zu trainieren und messbar besser zu werden.",
      inviteLink,
      "",
      "Mit AbschlussIO kannst du:",
      "- echte Verkaufssituationen simulieren",
      "- sofort Feedback erhalten",
      "- deine Abschlussquote steigern",
      "",
      "Der Link ist nur für dich gültig.",
      "",
      "Falls du Fragen hast, melde dich gerne.",
      "",
      "dein AbschlussIO Team",
    ].join("\n"),
    html: `
      <div style="margin:0;background:#f3f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="margin:0 auto;max-width:640px;overflow:hidden;border:1px solid #dbe5f1;border-radius:24px;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#0f4c81 0%,#153e75 100%);padding:32px 40px;color:#ffffff;">
            <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.82;">AbschlussIO</p>
            <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:700;">Du wurdest zu AbschlussIO eingeladen</h1>
          </div>
          <div style="padding:40px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi,</p>
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              du wurdest zu ${safeOrganizationName} in AbschlussIO eingeladen.
            </p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#334155;">
              Dein Team nutzt AbschlussIO, um Verkaufsgespräche zu trainieren und messbar besser zu werden.
            </p>
            <p style="margin:0 0 32px;">
              <a href="${safeInviteLink}" style="display:inline-block;border-radius:999px;background:#0f4c81;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                Einladung annehmen
              </a>
            </p>
            <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;">
              Mit AbschlussIO kannst du:
            </p>
            <ul style="margin:0 0 28px;padding-left:20px;font-size:15px;line-height:1.8;color:#334155;">
              <li>echte Verkaufssituationen simulieren</li>
              <li>sofort Feedback erhalten</li>
              <li>deine Abschlussquote steigern</li>
            </ul>
            <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#475569;">
              Der Link ist nur für dich gültig.
            </p>
            <p style="margin:0 0 20px;word-break:break-word;font-size:14px;line-height:1.7;">
              <a href="${safeInviteLink}" style="color:#0f4c81;text-decoration:underline;">${safeInviteLink}</a>
            </p>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#334155;">
              Falls du Fragen hast, melde dich gerne.
            </p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
              dein AbschlussIO Team
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

export async function sendInviteEmail({
  inviteToken,
  organizationName,
  recipientEmail,
  requestOrigin,
}: SendInviteEmailParams): Promise<InviteEmailSendResult> {
  const config = getInviteMailerConfig(inviteToken, requestOrigin);

  if (config.missingEnvVars.length > 0) {
    logInviteMailerWarning(
      `Invite email fallback active because configuration is incomplete: ${config.missingEnvVars.join(
        ", "
      )}.`
    );

    return {
      inviteLink: config.inviteLink,
      mode: "manual",
      reason: "not_configured",
    };
  }

  const email = buildInviteEmail({
    inviteLink: config.inviteLink,
    organizationName,
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
      logInviteMailerWarning(
        `Invite email could not be sent: ${result.errorMessage}. Falling back to manual link sharing.`
      );

      return {
        inviteLink: config.inviteLink,
        mode: "manual",
        reason: "send_failed",
      };
    }

    return {
      inviteLink: config.inviteLink,
      mode: "sent",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logInviteMailerWarning(
      `Invite email request failed: ${message}. Falling back to manual link sharing.`
    );

    return {
      inviteLink: config.inviteLink,
      mode: "manual",
      reason: "send_failed",
    };
  }
}
