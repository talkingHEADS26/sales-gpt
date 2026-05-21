import { NextResponse } from "next/server";

import { getMailEnvironmentConfig } from "@/lib/mail-config";
import { logSystemEvent } from "@/lib/system-monitoring";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

type HealthCheckStatus = "error" | "ok";

function listMissingEnvVars() {
  const mailConfig = getMailEnvironmentConfig();
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "MAIL_FROM",
    "MAIL_REPLY_TO",
    "MONITORING_ALERT_EMAIL",
  ];

  const missing = requiredEnvVars.filter((envName) => !process.env[envName]?.trim());

  if (!mailConfig.contactEmail) {
    missing.push("CONTACT_EMAIL");
  }

  return missing;
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks: Record<"app" | "db" | "env", HealthCheckStatus> = {
    app: "ok",
    db: "ok",
    env: "ok",
  };
  const errors: string[] = [];
  const missingEnvVars = listMissingEnvVars();

  if (missingEnvVars.length > 0) {
    checks.env = "error";
    errors.push(`Missing env vars: ${missingEnvVars.join(", ")}`);
  }

  const serviceRoleClient = getSupabaseServiceRoleClient();

  if (!serviceRoleClient) {
    checks.db = "error";
    errors.push("Supabase Service Role Client konnte nicht initialisiert werden.");
  } else {
    const { error } = await serviceRoleClient
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (error) {
      checks.db = "error";
      errors.push(error.message);
    }
  }

  const ok = checks.app === "ok" && checks.db === "ok" && checks.env === "ok";

  if (!ok) {
    await logSystemEvent({
      forceNotify: true,
      message: "Healthcheck failed",
      metadata: {
        checks,
        errors,
        missingEnvVars,
      },
      severity: "critical",
      source: "healthcheck",
    });
  }

  return NextResponse.json(
    {
      ok,
      checks,
      errors: errors.length > 0 ? errors : undefined,
      timestamp,
      build:
        process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
        process.env.npm_package_version ||
        "unknown",
    },
    { status: ok ? 200 : 503 }
  );
}
