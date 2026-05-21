import { NextResponse } from "next/server";

import { expireStaleCopeCartSubscriptions } from "@/lib/copecart-subscriptions";
import {
  getServiceRoleClientInitError,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";
import { getErrorMessage, logSystemEvent } from "@/lib/system-monitoring";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: Request) {
  const copecartCronSecret = process.env.COPECART_CRON_SECRET?.trim() || null;
  const trainingReminderCronSecret =
    process.env.TRAINING_REMINDER_CRON_SECRET?.trim() || null;
  const configuredSecret = copecartCronSecret || trainingReminderCronSecret;
  const requestUrl = new URL(request.url);
  const querySecret = requestUrl.searchParams.get("secret")?.trim() || null;

  const authorizationHeader = request.headers.get("authorization");
  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : null;
  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? null;

  console.info("[copecart-cron] auth check", {
    hasCopeCartCronSecret: Boolean(copecartCronSecret),
    hasTrainingReminderCronSecret: Boolean(trainingReminderCronSecret),
    hasQuerySecret: Boolean(querySecret),
    hasBearerSecret: Boolean(bearerToken),
  });

  if (!configuredSecret) {
    return {
      authorized: false,
      status: 500,
      message: "Missing env: COPECART_CRON_SECRET|TRAINING_REMINDER_CRON_SECRET",
    } as const;
  }

  if (
    querySecret === configuredSecret ||
    bearerToken === configuredSecret ||
    headerSecret === configuredSecret
  ) {
    return {
      authorized: true,
    } as const;
  }

  return {
    authorized: false,
    status: 401,
    message: "Nicht autorisiert.",
  } as const;
}

export async function POST(request: Request) {
  const auth = isAuthorizedCronRequest(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.message },
      { status: auth.status }
    );
  }

  const serviceRoleClient = getSupabaseServiceRoleClient();

  if (!serviceRoleClient) {
    const errorMessage =
      getServiceRoleClientInitError() ??
      "Supabase Service Role Client konnte nicht initialisiert werden.";

    await logSystemEvent({
      forceNotify: true,
      message: "CopeCart subscription cron could not initialize service role client",
      metadata: {
        error: errorMessage,
      },
      severity: "critical",
      source: "copecart_cron",
    });

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }

  try {
    const result = await expireStaleCopeCartSubscriptions(serviceRoleClient);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Die CopeCart-Pruefung ist fehlgeschlagen."
    );

    await logSystemEvent({
      forceNotify: true,
      message: "CopeCart subscription cron failed",
      metadata: {
        error: message,
      },
      severity: "critical",
      source: "copecart_cron",
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
