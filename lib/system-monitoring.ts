import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { sendMonitoringAlertEmail } from "@/lib/email/send-monitoring-alert";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

export type SystemEventSeverity = "info" | "warning" | "error" | "critical";

type SystemEventRow = {
  alert_sent_at: string | null;
  id: string;
};

type LogSystemEventParams = {
  environment?: string | null;
  forceNotify?: boolean;
  message: string;
  metadata?: Record<string, unknown> | null;
  organizationId?: string | null;
  severity: SystemEventSeverity;
  source: string;
};

const ALERT_COOLDOWN_MINUTES = 30;

function getRuntimeEnvironment() {
  return (
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV?.trim() ||
    "unknown"
  );
}

export function getErrorMessage(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}

function shouldSendAlert(params: LogSystemEventParams) {
  return params.severity === "critical" || params.forceNotify === true;
}

async function findRecentAlert(params: {
  message: string;
  severity: SystemEventSeverity;
  source: string;
}) {
  const serviceRoleClient = getSupabaseServiceRoleClient();

  if (!serviceRoleClient) {
    return null;
  }

  const cooldownThreshold = new Date(
    Date.now() - ALERT_COOLDOWN_MINUTES * 60 * 1000
  ).toISOString();

  const { data, error } = await serviceRoleClient
    .from("system_event_log")
    .select("id, alert_sent_at")
    .eq("severity", params.severity)
    .eq("source", params.source)
    .eq("message", params.message)
    .not("alert_sent_at", "is", null)
    .gte("created_at", cooldownThreshold)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SystemEventRow>();

  if (error) {
    console.error(`[system-monitoring] recent alert lookup failed: ${error.message}`);
    return null;
  }

  return data ?? null;
}

export async function notifySystemAlert(params: {
  environment?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  source: string;
  severity: SystemEventSeverity;
}) {
  const mailConfig = getMailEnvironmentConfig();

  if (!mailConfig.resendApiKey) {
    return {
      message: "RESEND_API_KEY fehlt.",
      notified: false,
    };
  }

  const result = await sendMonitoringAlertEmail({
    environment: params.environment?.trim() || getRuntimeEnvironment(),
    message: params.message,
    metadata: params.metadata,
    occurredAt: new Date().toISOString(),
    source: params.source,
    severity: params.severity,
  });

  if (!result.ok) {
    const errorMessage = "errorMessage" in result ? result.errorMessage : result.message;

    console.error(
      `[system-monitoring] alert email failed: ${errorMessage}`
    );

    return {
      message: errorMessage,
      notified: false,
    };
  }

  return {
    message: null,
    notified: true,
  };
}

export async function logSystemEvent({
  environment,
  forceNotify = false,
  message,
  metadata,
  organizationId = null,
  severity,
  source,
}: LogSystemEventParams) {
  const resolvedEnvironment = environment?.trim() || getRuntimeEnvironment();
  const serviceRoleClient = getSupabaseServiceRoleClient();
  let eventId: string | null = null;

  if (serviceRoleClient) {
    const { data, error } = await serviceRoleClient
      .from("system_event_log")
      .insert({
        environment: resolvedEnvironment,
        message,
        metadata: metadata ?? null,
        organization_id: organizationId,
        severity,
        source,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      console.error(`[system-monitoring] event log insert failed: ${error.message}`);
    } else {
      eventId = data.id;
    }
  } else {
    console.error("[system-monitoring] service role client unavailable for event log.");
  }

  if (!shouldSendAlert({ environment, forceNotify, message, metadata, organizationId, severity, source })) {
    return {
      eventId,
      notified: false,
    };
  }

  const recentAlert = await findRecentAlert({ message, severity, source });

  if (recentAlert) {
    return {
      eventId,
      notified: false,
    };
  }

  const alertResult = await notifySystemAlert({
    environment: resolvedEnvironment,
    message,
    metadata,
    source,
    severity,
  });

  if (alertResult.notified && eventId && serviceRoleClient) {
    const { error } = await serviceRoleClient
      .from("system_event_log")
      .update({ alert_sent_at: new Date().toISOString() })
      .eq("id", eventId);

    if (error) {
      console.error(
        `[system-monitoring] alert_sent_at update failed: ${error.message}`
      );
    }
  }

  return {
    eventId,
    notified: alertResult.notified,
  };
}
