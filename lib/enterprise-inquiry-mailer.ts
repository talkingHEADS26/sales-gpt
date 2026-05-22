import {
  getMailEnvironmentConfig,
  OFFICIAL_CONTACT_EMAIL,
} from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type SendEnterpriseInquiryParams = {
  email: string;
  inquiryType: "demo" | "enterprise";
  message: string;
  name: string;
  phone: string;
};

type EnterpriseInquiryMailerConfig = {
  adminEmail: string;
  fromEmail: string;
  missingEnvVars: string[];
  replyToEmail: string | null;
  resendApiKey: string | null;
};

export type EnterpriseInquirySendResult =
  | { mode: "sent" }
  | {
      message: string;
      mode: "skipped";
      reason: "not_configured" | "send_failed";
    };

const ENTERPRISE_INQUIRY_RECIPIENT = OFFICIAL_CONTACT_EMAIL;
const ENTERPRISE_INQUIRY_SUBJECT = "talkingHEADS Sales Trainer Anfrage";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logEnterpriseInquiryWarning(message: string) {
  console.warn(`[enterprise-inquiry] ${message}`);
}

function getEnterpriseInquiryMailerConfig(): EnterpriseInquiryMailerConfig {
  const mailConfig = getMailEnvironmentConfig();

  for (const warning of mailConfig.warnings) {
    logEnterpriseInquiryWarning(warning);
  }

  return {
    adminEmail: mailConfig.contactEmail,
    fromEmail: mailConfig.fromEmail,
    missingEnvVars: mailConfig.missingEnvVars,
    replyToEmail: mailConfig.replyToEmail,
    resendApiKey: mailConfig.resendApiKey,
  };
}

function buildEnterpriseInquiryEmail({
  email,
  inquiryType,
  message,
  name,
  phone,
}: SendEnterpriseInquiryParams) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeInquiryType = escapeHtml(
    inquiryType === "demo" ? "Demo" : "Enterprise"
  );
  const safePhone = escapeHtml(phone);
  const safeMessage = escapeHtml(message.trim());

  return {
    subject: ENTERPRISE_INQUIRY_SUBJECT,
    text: [
      "Neue Anfrage über talkingHEADS Sales Trainer:",
      "",
      `Formular-Typ: ${inquiryType === "demo" ? "Demo" : "Enterprise"}`,
      `Name: ${name}`,
      `Telefon: ${phone}`,
      `E-Mail: ${email}`,
      `Nachricht: ${message.trim()}`,
    ].join("\n"),
    html: `
      <div style="margin:0;background:#f3f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="margin:0 auto;max-width:640px;overflow:hidden;border:1px solid #dbe5f1;border-radius:24px;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#0f4c81 0%,#153e75 100%);padding:32px 40px;color:#ffffff;">
            <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.82;">talkingHEADS Sales Trainer</p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;">talkingHEADS Sales Trainer Anfrage</h1>
          </div>
          <div style="padding:40px;">
            <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">Neue Anfrage über talkingHEADS Sales Trainer:</p>
            <p style="margin:0 0 10px;font-size:15px;line-height:1.7;"><strong>Formular-Typ:</strong> ${safeInquiryType}</p>
            <p style="margin:0 0 10px;font-size:15px;line-height:1.7;"><strong>Name:</strong> ${safeName}</p>
            <p style="margin:0 0 10px;font-size:15px;line-height:1.7;"><strong>Telefon:</strong> ${safePhone}</p>
            <p style="margin:0 0 10px;font-size:15px;line-height:1.7;"><strong>E-Mail:</strong> ${safeEmail}</p>
            <p style="margin:0;font-size:15px;line-height:1.7;"><strong>Nachricht:</strong> ${safeMessage}</p>
          </div>
        </div>
      </div>
    `,
  };
}

export async function sendEnterpriseInquiryEmail(
  params: SendEnterpriseInquiryParams
): Promise<EnterpriseInquirySendResult> {
  const config = getEnterpriseInquiryMailerConfig();

  if (config.missingEnvVars.length > 0) {
    const message = `Der E-Mail-Versand ist aktuell nicht vollständig konfiguriert: ${config.missingEnvVars.join(
      ", "
    )}.`;
    logEnterpriseInquiryWarning(message);

    return {
      message,
      mode: "skipped",
      reason: "not_configured",
    };
  }

  try {
    const email = buildEnterpriseInquiryEmail(params);
    const result = await sendResendEmail({
      from: config.fromEmail,
      html: email.html,
      replyTo: config.replyToEmail,
      resendApiKey: config.resendApiKey as string,
      subject: email.subject,
      text: email.text,
      to: [config.adminEmail],
    });

    if (!result.ok) {
      logEnterpriseInquiryWarning(
        `Inquiry email could not be sent: ${result.errorMessage}.`
      );

      return {
        message: result.errorMessage,
        mode: "skipped",
        reason: "send_failed",
      };
    }

    return { mode: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logEnterpriseInquiryWarning(`Inquiry email request failed: ${message}.`);

    return {
      message,
      mode: "skipped",
      reason: "send_failed",
    };
  }
}

export {
  ENTERPRISE_INQUIRY_RECIPIENT,
  ENTERPRISE_INQUIRY_SUBJECT,
};
