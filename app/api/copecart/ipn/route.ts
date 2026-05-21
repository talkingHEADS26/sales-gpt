import { NextResponse } from "next/server";

import {
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";
import {
  normalizeCopeCartIpnEvent,
  processCopeCartIpn,
} from "@/lib/copecart-subscriptions";
import { logSystemEvent } from "@/lib/system-monitoring";

export const runtime = "nodejs";

function isIpnEnabled() {
  return process.env.COPECART_IPN_ENABLED?.trim() === "true";
}

function getExpectedSecret() {
  return process.env.COPECART_IPN_SECRET?.trim() || null;
}

function getProvidedSecret(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return (
    url.searchParams.get("secret")?.trim() ||
    request.headers.get("x-copecart-secret")?.trim() ||
    request.headers.get("x-copecart-ipn-secret")?.trim() ||
    request.headers.get("x-webhook-secret")?.trim() ||
    null
  );
}

function parseIpnPayload(rawBody: string, contentType: string | null) {
  if (contentType?.includes("application/json")) {
    const parsedBody = JSON.parse(rawBody) as unknown;

    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      throw new Error("CopeCart IPN JSON payload ist ungültig.");
    }

    return parsedBody as Record<string, unknown>;
  }

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }

  try {
    const parsedJson = JSON.parse(rawBody) as unknown;

    if (parsedJson && typeof parsedJson === "object" && !Array.isArray(parsedJson)) {
      return parsedJson as Record<string, unknown>;
    }
  } catch {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }

  throw new Error("CopeCart IPN payload konnte nicht geparst werden.");
}

function buildSanitizedLog(event: ReturnType<typeof normalizeCopeCartIpnEvent>) {
  return {
    amount: event.amount,
    customerEmail: event.customerEmail,
    eventType: event.eventType,
    orderId: event.orderId,
    productId: event.productId,
    status: event.status,
  };
}

export async function POST(request: Request) {
  if (!isIpnEnabled()) {
    return NextResponse.json(
      { error: "CopeCart IPN ist nicht aktiviert." },
      { status: 503 }
    );
  }

  const expectedSecret = getExpectedSecret();
  const providedSecret = getProvidedSecret(request);
  const isProduction = process.env.NODE_ENV === "production";

  if ((isProduction || expectedSecret) && expectedSecret !== providedSecret) {
    await logSystemEvent({
      message: "Rejected CopeCart IPN because secret validation failed",
      metadata: {
        hasExpectedSecret: Boolean(expectedSecret),
        hasProvidedSecret: Boolean(providedSecret),
      },
      severity: "warning",
      source: "copecart_ipn",
    });

    return NextResponse.json({ error: "Ungültiges IPN-Secret." }, { status: 401 });
  }

  const serviceRoleClient = getSupabaseServiceRoleClient();

  if (!serviceRoleClient) {
    return NextResponse.json(
      { error: "Supabase Service Role Client konnte nicht initialisiert werden." },
      { status: 500 }
    );
  }

  try {
    const rawBody = await request.text();
    const payload = parseIpnPayload(rawBody, request.headers.get("content-type"));
    const normalizedEvent = normalizeCopeCartIpnEvent({ payload, rawBody });

    console.info("[copecart-ipn] received", buildSanitizedLog(normalizedEvent));

    const result = await processCopeCartIpn({
      event: normalizedEvent,
      serviceRoleClient,
    });

    return NextResponse.json({
      duplicate: result.duplicate,
      message: result.message,
      ok: true,
      processed: result.processed,
      subscriptionStatus: result.subscriptionStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "CopeCart IPN konnte nicht verarbeitet werden.";

    await logSystemEvent({
      message: "CopeCart IPN processing failed",
      metadata: {
        error: message,
      },
      severity: "error",
      source: "copecart_ipn",
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
