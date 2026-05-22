import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type SendAdminApprovalNotificationParams = {
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  registeredAt: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const FALLBACK_ADMIN_URL = "https://sales.diebestenberatungsagenturen.de/admin";

export async function sendAdminApprovalNotificationEmail({
  email,
  firstName,
  lastName,
  organizationName,
  registeredAt,
}: SendAdminApprovalNotificationParams) {
  const mailConfig = getMailEnvironmentConfig();

  if (!mailConfig.resendApiKey) {
    return {
      message: "RESEND_API_KEY fehlt.",
      ok: false as const,
    };
  }

  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
  const adminUrl = mailConfig.appBaseUrl
    ? `${mailConfig.appBaseUrl}/admin`
    : FALLBACK_ADMIN_URL;
  const subject = "Neuer Benutzer wartet auf Freischaltung";
  const text = [
    "Ein neuer Benutzer hat sich registriert und wartet auf Freischaltung.",
    "",
    `Name: ${fullName || "Nicht angegeben"}`,
    `E-Mail: ${email}`,
    `Organisation: ${organizationName || "Nicht angegeben"}`,
    `Zeitpunkt: ${registeredAt}`,
    "",
    "Der User ist standardmäßig inaktiv und muss manuell im Adminbereich freigeschaltet werden.",
    `Adminbereich: ${adminUrl}`,
  ].join("\n");

  const html = `
    <div style="margin:0;background:#f3f6fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="margin:0 auto;max-width:640px;border:1px solid #dbe5f1;border-radius:20px;background:#ffffff;padding:28px;">
        <h1 style="margin:0 0 16px;font-size:22px;">Neuer Benutzer wartet auf Freischaltung</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
          Ein neuer Benutzer hat sich registriert und wartet auf Freischaltung.
        </p>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.7;"><strong>Name:</strong> ${escapeHtml(fullName || "Nicht angegeben")}</p>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.7;"><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.7;"><strong>Organisation:</strong> ${escapeHtml(organizationName || "Nicht angegeben")}</p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;"><strong>Zeitpunkt:</strong> ${escapeHtml(registeredAt)}</p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">
          Der User ist standardmäßig inaktiv und muss manuell im Adminbereich freigeschaltet werden.
        </p>
        <p style="margin:0;font-size:15px;line-height:1.7;">
          <a href="${escapeHtml(adminUrl)}" style="color:#0e51a0;">Adminbereich öffnen</a>
        </p>
      </div>
    </div>
  `;

  return sendResendEmail({
    from: mailConfig.fromEmail,
    html,
    replyTo: mailConfig.replyToEmail,
    resendApiKey: mailConfig.resendApiKey,
    subject,
    text,
    // Centralized recipient so product-owner changes only require one env update.
    to: [mailConfig.internalSignupAlertEmail],
  });
}
