import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { sendResendEmail } from "@/lib/resend-mail";

type MonitoringAlertSeverity = "critical" | "error" | "info" | "warning";

type SendMonitoringAlertParams = {
  environment: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  source: string;
  severity: MonitoringAlertSeverity;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "Keine Zusatzdaten";
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "Metadata konnten nicht serialisiert werden.";
  }
}

function buildMonitoringAlertSubject({
  message,
  source,
}: {
  message: string;
  source: string;
}) {
  const compactMessage = message.trim().replace(/\s+/g, " ");

  if (compactMessage.toLowerCase().includes("healthcheck")) {
    return "[AbschlussIO Alert] Healthcheck failed";
  }

  return `[AbschlussIO Alert] ${compactMessage || `Critical error in ${source}`}`.slice(
    0,
    140
  );
}

export async function sendMonitoringAlertEmail({
  environment,
  message,
  metadata,
  occurredAt,
  source,
  severity,
}: SendMonitoringAlertParams) {
  const mailConfig = getMailEnvironmentConfig();

  if (!mailConfig.resendApiKey) {
    return {
      message: "RESEND_API_KEY fehlt.",
      ok: false as const,
    };
  }

  const metadataText = formatMetadata(metadata);
  const adminUrl = mailConfig.appBaseUrl ? `${mailConfig.appBaseUrl}/admin` : null;
  const subject = buildMonitoringAlertSubject({ message, source });
  const text = [
    "AbschlussIO Monitoring Alert",
    "",
    `Severity: ${severity}`,
    `Source: ${source}`,
    `Message: ${message}`,
    `Timestamp: ${occurredAt}`,
    `Environment: ${environment}`,
    "",
    "Metadata:",
    metadataText,
    "",
    adminUrl ? `Weiterpruefen: ${adminUrl}` : "Weiterpruefen: /admin",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;padding:24px;background:#f9fafb;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
        <h1 style="margin:0 0 16px;font-size:20px;">AbschlussIO Monitoring Alert</h1>
        <p style="margin:0 0 8px;"><strong>Severity:</strong> ${escapeHtml(severity)}</p>
        <p style="margin:0 0 8px;"><strong>Source:</strong> ${escapeHtml(source)}</p>
        <p style="margin:0 0 8px;"><strong>Message:</strong> ${escapeHtml(message)}</p>
        <p style="margin:0 0 8px;"><strong>Timestamp:</strong> ${escapeHtml(occurredAt)}</p>
        <p style="margin:0 0 16px;"><strong>Environment:</strong> ${escapeHtml(environment)}</p>
        <p style="margin:0 0 8px;"><strong>Metadata:</strong></p>
        <pre style="margin:0 0 16px;padding:16px;border-radius:12px;background:#f3f4f6;overflow:auto;white-space:pre-wrap;">${escapeHtml(
          metadataText
        )}</pre>
        <p style="margin:0;">
          <strong>Weiterpruefen:</strong>
          ${
            adminUrl
              ? `<a href="${escapeHtml(adminUrl)}" style="color:#0e51a0;">${escapeHtml(
                  adminUrl
                )}</a>`
              : "/admin"
          }
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
    to: [mailConfig.monitoringAlertEmail],
  });
}
